/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import type Ajv from 'ajv'
import type * as Immer from 'immer'

import * as s from './symbols'
import { Type, Definition, TypeCreator } from './types'
import { mapProps } from './map-props'
import { ValidationError } from './error'

import type { InferShapeOfDef, InferModelByOptions } from './inference'
import type { JSONSchema } from './types'

// TODO(@shqld): might collide
const genId = () => ((Date.now() % 99) + Math.random() * 99).toString(36)

export type ModelInit<Model> = Pick<
    Model,
    {
        [K in keyof Model]-?: Model[K] extends Function ? never : K
    }[keyof Model]
>

export interface Model<Def extends Definition, Shape = InferShapeOfDef<Def>> {
    type: Type<Shape>
    new (obj: Shape): Shape
    create(obj: Shape): Shape
    raw(obj: any): Shape
}

export interface Options {
    ajv?:
        | {
              compile: Ajv.Ajv['compile']
              errorsText: Ajv.Ajv['errorsText']
              addSchema: Ajv.Ajv['addSchema']
          }
        | false
    immer?:
        | {
              produce: typeof Immer.produce
              immerable: typeof Immer.immerable
          }
        | false
}

type Extensions = {
    extend(def: Definition): Extensions
    validate(obj: any): void
    produce: Function
}

export function init<Opts extends Options>(
    opts?: Opts
): {
    model<Def extends Definition, Class extends InferModelByOptions<Def, Opts>>(
        def: Def
    ): Class
} {
    const { ajv, immer } = opts || {}

    function model(def: Definition): Model<any> & Extensions {
        const id = genId()

        const modelType = new Type({
            $ref: id,
        })

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

        for (const key in def) {
            mapping.push('this.' + key + '=o.' + key)

            const prop: Type | TypeCreator = def[key]
            const type = typeof prop !== 'function' ? prop : prop(modelType)

            if (type[s.__source]) {
                remapping.push('o.' + key + '=o.' + type[s.__source])
            }

            mapProps(schema, type[s.__source] || key, type)
        }

        if (ajv) ajv.addSchema(schema)
        if (immer) mapping.push('return this.constructor.produce(this, o=>o)')

        const constructor: Model<any> & Extensions = new Function(
            'o',
            mapping.join(';')
        ) as any

        const remapper = remapping.length
            ? (new Function('o', remapping.join(';')) as (obj: any) => any)
            : null

        const raw = (obj: any) => {
            if (remapper) remapper(obj)
            return new constructor(obj)
        }

        constructor.type = modelType
        constructor.extend = (extended: Definition) =>
            model({
                ...def,
                ...extended,
            })
        constructor.create = (obj: any) => new constructor(obj)
        constructor.raw = raw

        let cache: Ajv.ValidateFunction
        if (ajv) {
            const validate = (obj: any) => {
                if (!cache) cache = ajv.compile(constructor.type[s.__schema])
                cache(obj)
                if (cache.errors)
                    throw new ValidationError(ajv.errorsText(cache.errors))
            }
            constructor.validate = validate
            constructor.raw = (obj: any) => {
                validate(obj)
                return raw(obj)
            }
        }
        if (immer) {
            constructor.prototype[immer.immerable] = true
            constructor.produce = immer.produce
        }

        // @ts-ignore
        // Type 'typeof (Anonymous class)' is not assignable to type 'Class'.
        //   'Class' could be instantiated with an arbitrary type which could be unrelated to 'typeof (Anonymous class)'.ts(2322)
        return constructor
    }

    return {
        // @ts-expect-error ts(2322)
        model,
    }
}
