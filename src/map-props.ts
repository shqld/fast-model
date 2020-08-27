import * as s from './symbols'
import type { JSONSchema, Type } from './types'

export function mapProps(
    schema: JSONSchema & {
        properties: Record<string, JSONSchema>
        required: Array<string>
    },
    key: string,
    type: Type
): void {
    schema.properties[key] = type[s.__schema]
    if (type[s.__required]) schema.required.push(key)
}
