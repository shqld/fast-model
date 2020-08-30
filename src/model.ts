/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */

import * as s from './symbols'
import { Type, Definition } from './types'
import { mapProps } from './map-props'
import { ValidationError } from './error'

import type { InferShapeOfDef } from './inference'
import type { JSONSchema } from './types'
import type {
    Extensions,
    InferExtensionsByOptions as InferExtensions,
    Ajv,
    Immer,
} from './extensions'

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
    ajv?: Ajv | false
    immer?: Immer | false
}

export function init<Opts extends Options>(
    opts?: Opts
): {
    model<Def extends Definition, Class extends InferExtensions<Def, Opts>>(
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

        for (const [key, prop] of Object.entries(def)) {
            mapping.push('this.' + key + '=o.' + key)

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

        const remapper =
            remapping.length &&
            (new Function('o', remapping.join(';')) as (obj: any) => void)

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

        if (ajv) {
            const compiled = ajv.compile(constructor.type[s.__schema])
            const validate = (obj: any): obj is { a: 1 } => {
                compiled(obj)
                if (compiled.errors)
                    throw new ValidationError(ajv.errorsText(compiled.errors))
                return true
            }

            constructor.validate = validate
            constructor.raw = (obj: any) =>
                (validate(obj) as true | never) && raw(obj)
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
