/* eslint-disable @typescript-eslint/no-inferrable-types */
import * as s from './symbols'
import { mapProps } from './map-props'

import type { JSONSchema7 as JSONSchema } from 'json-schema'
import type { InferValueOfType, InferShapeOfDef } from './inference'

export type { JSONSchema }
export type TypeCreator = (self: Type) => Type
export type Definition = Record<string, Type | TypeCreator>

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

    get schema(): JSONSchema {
        return this[s.__schema]
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

export const object = <Def extends Record<string, Type>>(
    props: Def
): Type<InferShapeOfDef<Def>> => {
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

export const array = <T extends Type>(obj: T): Type<InferValueOfType<T>> =>
    new Type({
        type: 'array',
        items: obj[s.__schema],
    })

export const anyOf = <T extends ReadonlyArray<Type>>(
    ...objs: T
): Type<Array<InferValueOfType<T[number]>>> =>
    new Type({
        anyOf: objs.map((obj) => obj[s.__schema]),
    })

// export const tuple = <
//     T extends ReadonlyArray<any> &
//         (number extends T['length'] ? never : unknown),
//     Pure = Pick<T, Exclude<keyof T, keyof Array<Type>>>
// >(
//     ...objs: T
// ): Type<
//     Array<
//         keyof Pure extends infer K
//             ? K extends number
//                 ? InferValueOfType<T[K]>
//                 : never
//             : never
//     > & {
//         length: T['length']
//     } & {
//             [K in keyof Pure]: InferValueOfType<
//                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                 // @ts-expect-error
//                 T[K]
//             >
//         }
// > =>
//     new Type({
//         type: 'array',
//         items: objs.map((obj) => obj[s.__schema]),
//     })
