import { JSONSchema } from './schema'
import { OmitByValue } from 'utility-types'

export type InferValueOfType<T extends Type> = T extends Type<infer U>
    ? U
    : never

export type A = {
    required: boolean
    source?: string
    __schema: JSONSchema
}
export class Type<
    Inferred = any,
    Meta extends { required: boolean } = { required: false }
> {
    __type: A = {
        required: false,
    } as A

    constructor(schema: JSONSchema) {
        this.__type.__schema = schema
    }

    required<This extends Type>(
        this: This
    ): This extends Type<infer T, infer M>
        ? Type<T, { required: true }>
        : never {
        this.__type.required = true
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this
    }

    source<This extends Type>(this: This, source: Readonly<string>): This {
        this.__type.source = source
        return this
    }
}

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
