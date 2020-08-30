/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import type Ajv from 'ajv'
import type * as Immer from 'immer'
import type Produce from 'immer'

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
    extend<ExtendedDef extends Definition>(
        def: ExtendedDef
    ): ValidationModel<ExtendedDef & Def>
}

export interface ImmutableModel<
    Def extends Definition,
    Shape = InferShapeOfDef<Def>
> extends Model<Def, Shape> {
    produce: typeof Immer.produce
    extend<ExtendedDef extends Definition>(
        def: ExtendedDef
    ): ImmutableModel<ExtendedDef & Def>
}

export interface Options {
    ajv?: Ajv.Ajv | false
    immer?: typeof Immer | false
}

type InferModelByOpts<
    Def extends Definition,
    Opts extends Options
> = (Opts['ajv'] extends Ajv.Ajv ? ValidationModel<Def> : Model<Def>) &
    (Opts['immer'] extends typeof Immer ? ImmutableModel<Def> : Model<Def>)

export function init(): {
    model<Def extends Definition, Class extends Model<Def>>(def: Def): Class
}
// @ts-ignore This overload signature is not compatible with its implementation signature.ts(2394)
export function init<Opts extends Options>(
    options: Opts
): {
    model<
        Def extends Definition,
        Class extends Model<
            Def,
            Opts['immer'] extends typeof Immer
                ? Readonly<InferShapeOfDef<Def>>
                : InferShapeOfDef<Def>
        > &
            (Opts['ajv'] extends Ajv.Ajv
                ? {
                      validate(obj: any): void
                      extend<ExtendedDef extends Definition>(
                          def: ExtendedDef
                      ): ValidationModel<ExtendedDef & Def>
                  }
                : {}) &
            (Opts['immer'] extends typeof Immer
                ? {
                      produce: typeof Immer.produce &
                          (<T extends Readonly<InferShapeOfDef<Def>>>(
                              base: T,
                              updater: (draft: T) => T
                          ) => Readonly<InferShapeOfDef<Def>>)
                      extend<ExtendedDef extends Definition>(
                          def: ExtendedDef
                      ): ImmutableModel<ExtendedDef & Def>
                  }
                : {})
    >(
        def: Def
    ): Class
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function init({
    ajv,
    immer,
}: { ajv?: Ajv.Ajv; immer?: typeof Immer } = {}) {
    function model<
        Def extends Definition,
        Class extends Model<Def> & ValidationModel<Def> & ImmutableModel<Def>
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
        if (immer) mapping.push('return this.constructor.produce(this, o=>o)')

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
        model,
    }
}

function passThrough<T>(obj: T): T {
    return obj
}
