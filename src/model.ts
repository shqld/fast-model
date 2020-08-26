/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import Ajv from 'ajv'
import { JSONSchema } from './schema'
import { Type, InferShapeOfMap, SchemaMap, Model, ModelInit } from './types'

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

let index = 0

export function fm(ajv: Ajv.Ajv) {
    function model<
        Map extends SchemaMap,
        Instance extends InferShapeOfMap<Map>,
        Class extends Model<Instance>
    >(map: Map): Class {
        const id = String(index++)

        const schema = {
            $id: id,
            type: 'object',
            properties: {} as Record<string, JSONSchema>,
            required: [] as Array<string>,
        }

        const mapping = []
        const remapping = []

        for (let key in map) {
            mapping.push('this.' + key + '=obj.' + key)

            const type = map[key].__type

            if (type.source) {
                remapping.push('obj.' + key + '=obj.' + type.source)
                key = type.source as any
            }

            schema.properties[key] = type.__schema
            if (type.required) schema.required.push(key)
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
            static type = new Type<Instance>({
                $ref: id,
            })
            static extend(merged: Map) {
                return model({
                    ...map,
                    ...merged,
                })
            }
            static validate(obj: any) {
                if (!validate) validate = ajv.compile(this.type.__type.__schema)
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
