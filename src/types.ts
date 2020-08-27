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

export type ShapeMap = Record<string, Type>

export type RequiredKeys<Map extends ShapeMap> = Pick<
    Map,
    {
        [K in keyof Map]-?: ExtractMetaFromType<Map[K]>['required'] extends true
            ? K
            : never
    }[keyof Map]
>

// waiting for https://github.com/microsoft/TypeScript/pull/40002
export type InferShapeOfMap<Map extends ShapeMap> = {
    [K in keyof Map]?: InferValueOfType<Map[K]>
} &
    {
        [L in keyof RequiredKeys<Map>]-?: InferValueOfType<Map[L]>
    }

export type ModelInit<Instance> = OmitByValue<Instance, Function>

export type Model<Map extends ShapeMap, Shape = InferShapeOfMap<Map>> = {
    type: Type<Shape>
    new (obj: Shape): Shape
    raw(obj: any): Shape
    validate(obj: any): void
    extend<ExtendedMap extends ShapeMap>(
        map: ExtendedMap
    ): Model<ExtendedMap & Map>
}
