/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import type Ajv from 'ajv'
import type { OmitByValue } from 'utility-types'

import * as s from './symbols'
import { Type, ShapeMap } from './types'
import { mapProps } from './map-props'
import { ValidationError } from './error'

import type { InferShapeOfMap } from './inference'
import type { JSONSchema } from './types'

// TODO(@shqld): might collide
const genId = () => ((Date.now() % 99) + Math.random() * 99).toString(36)

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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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

            mapProps(schema, type[s.__source] || key, type)
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
