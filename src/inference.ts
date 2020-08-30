import type { Type, TypeCreator, ShapeMap } from './types'

export type InferValueOfType<T extends Type | TypeCreator> = T extends Type<
    infer U
>
    ? U
    : T extends TypeCreator
    ? ReturnType<T> extends Type<infer U>
        ? U
        : never
    : never

export type ExtractMetaFromType<T extends Type | TypeCreator> = T extends Type<
    unknown,
    infer M
>
    ? M
    : T extends TypeCreator
    ? ReturnType<T> extends Type<
    unknown,
    infer N
    >
        ? N
        : never
    : never

export type RequiredKeys<Map extends ShapeMap> = Pick<
    Map,
    {
        [K in keyof Map]-?: ExtractMetaFromType<Map[K]>['required'] extends true
            ? K
            : never
    }[keyof Map]
>

// waiting for https://github.com/microsoft/TypeScript/pull/40002
export type InferShapeOfMap<Map extends ShapeMap> = {
    [K in keyof Map]?: InferValueOfType<Map[K]>
} &
    {
        [L in keyof RequiredKeys<Map>]-?: InferValueOfType<Map[L]>
    }
