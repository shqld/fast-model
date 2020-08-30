/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import type Ajv from 'ajv'

import * as s from './symbols'
import { Type, Definition, TypeCreator } from './types'
import { mapProps } from './map-props'
import { ValidationError } from './error'

import type { InferShapeOfDef } from './inference'
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
    extend<ExtendedDef extends Definition>(
        def: ExtendedDef
    ): Model<ExtendedDef & Def>
}

export interface ValidationModel<
    Def extends Definition,
    Shape = InferShapeOfDef<Def>
> extends Model<Def, Shape> {
    validate(obj: any): void
}

export function init(): {
    model<Def extends Definition, Class extends Model<Def>>(def: Def): Class
}
export function init(
    ajv: Ajv.Ajv
): {
    model<Def extends Definition, Class extends ValidationModel<Def>>(
        def: Def
    ): Class
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function init(ajv?: Ajv.Ajv) {
    function model<
        Def extends Definition,
        Class extends Model<Def> & ValidationModel<Def>
    >(def: Def): Class {
        const id = genId()

        const modelType = new Type<InferShapeOfDef<Def>>({
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

        const constructor: Class = new Function('o', mapping.join(';')) as any

        const remapper = remapping.length
            ? (new Function('o', remapping.join(';')) as (obj: any) => any)
            : null

        const raw = (obj: any) => {
            if (remapper) remapper(obj)
            return new constructor(obj)
        }

        constructor.type = modelType
        constructor.extend = ((extended: Def) =>
            model({
                ...def,
                ...extended,
            })) as any
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

        // @ts-ignore
        // Type 'typeof (Anonymous class)' is not assignable to type 'Class'.
        //   'Class' could be instantiated with an arbitrary type which could be unrelated to 'typeof (Anonymous class)'.ts(2322)
        return constructor
    }

    return {
        model,
    }
}
