import { JSONSchema } from './schema'
import { OmitByValue } from 'utility-types'

export class Type<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Inferred = any,
    Meta extends { required: boolean } = { required: false }
> {
    __schema: JSONSchema
    __required = false
    __source?: string

    constructor(schema: JSONSchema) {
        this.__schema = schema
    }

    required<This extends Type>(
        this: This,
        required?: true
    ): This extends Type<infer T, infer M> ? Type<T, { required: true }> : never
    required<This extends Type>(
        this: This,
        required: false
    ): This extends Type<infer T, infer M>
        ? Type<T, { required: false }>
        : never
    required(): this {
        this.__required = true
        return this
    }

    source<This extends Type>(
        this: This,
        source: Readonly<string> | undefined
    ): This {
        this.__source = source
        return this
    }
}

export type InferValueOfType<T extends Type> = T extends Type<infer U>
    ? U
    : never

export type ExtractMetaFromType<T extends Type> = T extends Type<
    unknown,
    infer M
>
    ? M
    : never

export type RequiredKeys<Map extends SchemaMap> = Pick<
    Map,
    {
        [K in keyof Map]-?: ExtractMetaFromType<Map[K]>['required'] extends true
            ? K
            : never
    }[keyof Map]
>

// waiting for https://github.com/microsoft/TypeScript/pull/40002
export type InferShapeOfMap<Map extends SchemaMap> = {
    [K in keyof Map]?: InferValueOfType<Map[K]>
} &
    {
        [L in keyof RequiredKeys<Map>]-?: InferValueOfType<Map[L]>
    }

export type SchemaMap = Record<string, Type>

export type InferInstance<T extends Model<any>> = T extends Model<infer U>
    ? U
    : never

export type Model<Instance> = {
    new (obj: Instance): Instance
    raw(obj: any): Instance
    validate(obj: any): void
    extend<
        _Map extends SchemaMap,
        _Instance extends InferShapeOfMap<_Map>,
        _Class extends Model<_Instance & Instance>
    >(
        map: _Map
    ): _Class
    type: Type<Instance>
}

export type ModelInit<Instance> = OmitByValue<Instance, Function>
