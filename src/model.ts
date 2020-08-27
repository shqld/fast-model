/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import type Ajv from 'ajv'
import * as s from './symbols'
import { JSONSchema } from './schema'
import {
    Type,
    InferShapeOfMap,
    Model,
    ShapeMap,
    InferValueOfType,
} from './types'

// TODO(@shqld): might collide
const genId = () => ((Date.now() % 99) + Math.random() * 99).toString(36)

export class ValidationError extends Error {}
ValidationError.prototype.name = 'ValidationError'

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

function mapToProps(
    schema: JSONSchema & {
        properties: Record<string, JSONSchema>
        required: Array<string>
    },
    key: string,
    type: Type
) {
    schema.properties[key] = type[s.__schema]
    if (type[s.__required]) schema.required.push(key)
}

export const object = <Map extends ShapeMap>(
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
        mapToProps(schema, key, props[key])
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

export function fm(ajv: Ajv.Ajv) {
    function model<Map extends ShapeMap, Class extends Model<Map>>(
        map: Map
    ): Class {
        const id = genId()

        const schema: JSONSchema & {
            properties: Record<string, JSONSchema>
            required: Array<string>
        } = {
            $id: id,
            type: 'object',
            properties: {} as Record<string, JSONSchema>,
            required: [] as Array<string>,
        }

        const mapping = []
        const remapping = []

        for (const key in map) {
            mapping.push('this.' + key + '=o.' + key)

            const type = map[key]

            if (type[s.__source]) {
                remapping.push('o.' + key + '=o.' + type[s.__source])
            }

            mapToProps(schema, type[s.__source] || key, type)
        }

        ajv.addSchema(schema)

        const constructor: Class = new Function('o', mapping.join(';')) as any

        const remapper = remapping.length
            ? (new Function('o', remapping.join(';')) as (obj: any) => any)
            : null

        let validate: Ajv.ValidateFunction

        constructor.type = new Type<InferShapeOfMap<Map>>({
            $ref: id,
        })
        constructor.extend = ((extended: Map) =>
            model({
                ...map,
                ...extended,
            })) as any
        constructor.validate = (obj: any) => {
            if (!validate) validate = ajv.compile(constructor.type[s.__schema])
            validate(obj)
            if (validate.errors)
                throw new ValidationError(ajv.errorsText(validate.errors))
        }
        constructor.raw = (obj: any) => {
            constructor.validate(obj)
            if (remapper) remapper(obj)
            return new constructor(obj)
        }

        // @ts-ignore
        // Type 'typeof (Anonymous class)' is not assignable to type 'Class'.
        //   'Class' could be instantiated with an arbitrary type which could be unrelated to 'typeof (Anonymous class)'.ts(2322)
        return constructor
    }

    return {
        model,
    }
}

// const ajv = new Ajv()
// const { model } = fm(ajv)

// const B = model({
//     a: number(),
//     b: number().required(),
//     c: string(),
//     d: string().required(),
// })
// const b = new B({ a: 1, b: 2, c: '', d: '' })

// const D = model({ e: string().required(), f: B.type.required() })
// const d = new D({ e: '', f: { b: 2, d: '' } })
// d.f

// class C extends B {
//     a: number

//     constructor(obj: Optional<ModelInit<C>, 'a'>) {
//         super(obj)

//         if (!obj.a) throw new Error('')
//         this.a = obj.a
//     }

//     x() {
//         return this.d
//     }
// }

// const c = new C({ b: 2, c: '', d: '' })
// c.c
