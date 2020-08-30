/* eslint-disable @typescript-eslint/no-inferrable-types */
import * as s from './symbols'
import { mapProps } from './map-props'

import type { JSONSchema7 as JSONSchema } from 'json-schema'
import type { InferValueOfType, InferShapeOfMap } from './inference'

export type { JSONSchema }
export type TypeCreator = (self: Type) => Type
export type ShapeMap = Record<string, Type | TypeCreator>

export class Type<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Inferred = any,
    Meta extends { required: boolean } = { required: false }
> {
    [s.__schema]: JSONSchema;
    [s.__required]: boolean = false;
    [s.__source]?: string

    constructor(schema: JSONSchema) {
        this[s.__schema] = schema
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
        this[s.__required] = true
        return this
    }

    source<This extends Type>(
        this: This,
        source: Readonly<string> | undefined
    ): This {
        this[s.__source] = source
        return this
    }
}

export const string = (): Type<string> =>
    new Type({
        type: 'string',
    })
export const number = (): Type<number> =>
    new Type({
        type: 'number',
    })
export const boolean = (): Type<boolean> =>
    new Type({
        type: 'boolean',
    })

export const object = <Map extends Record<string, Type>>(
    props: Map
): Type<InferShapeOfMap<Map>> => {
    const schema: JSONSchema & {
        properties: Record<string, JSONSchema>
        required: Array<string>
    } = {
        type: 'object',
        properties: {},
        required: [],
    }

    for (const key in props) {
        mapProps(schema, key, props[key])
    }

    return new Type(schema)
}

export const array = <T extends Type>(
    obj: T
): Type<Array<InferValueOfType<T>>> =>
    new Type({
        type: 'array',
        items: obj[s.__schema],
    })
