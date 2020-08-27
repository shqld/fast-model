/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import Ajv from 'ajv'
import { JSONSchema } from './schema'
import { Type, InferShapeOfMap, Model, ShapeMap } from './types'

// TODO(@shqld): might collide
const genId = () => ((Date.now() % 99) + Math.random() * 99).toString(36)

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
    schema.properties[key] = type.__schema
    if (type.__required) schema.required.push(key)
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
            mapping.push('this.' + key + '=obj.' + key)

            const type = map[key]

            if (type.__source) {
                remapping.push('obj.' + key + '=obj.' + type.__source)
            }

            mapToProps(schema, type.__source || key, type)
        }

        ajv.addSchema(schema)

        const constructor = new Function('obj', mapping.join(';')) as {
            new (obj: any): any
        }

        const remapper = remapping.length
            ? (new Function('obj', remapping.join(';')) as (obj: any) => any)
            : null

        let validate: Ajv.ValidateFunction

        // @ts-ignore
        // Type 'typeof (Anonymous class)' is not assignable to type 'Class'.
        //   'Class' could be instantiated with an arbitrary type which could be unrelated to 'typeof (Anonymous class)'.ts(2322)
        return class extends constructor {
            static type = new Type<InferShapeOfMap<Map>>({
                $ref: id,
            })
            static extend(merged: Map) {
                return model({
                    ...map,
                    ...merged,
                })
            }
            static validate(obj: any) {
                if (!validate) validate = ajv.compile(this.type.__schema)
                validate(obj)
                if (validate.errors)
                    throw new Error(ajv.errorsText(validate.errors))
            }
            static raw(obj: any) {
                this.validate(obj)
                if (remapper) remapper(obj)
                return new this(obj)
            }
        }
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
