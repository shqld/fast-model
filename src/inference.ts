import type { Type, TypeCreator, Definition } from './types'

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
    ? ReturnType<T> extends Type<unknown, infer N>
        ? N
        : never
    : never

export type RequiredKeys<Def extends Definition> = Pick<
    Def,
    {
        [K in keyof Def]-?: ExtractMetaFromType<Def[K]>['required'] extends true
            ? K
            : never
    }[keyof Def]
>

// waiting for https://github.com/microsoft/TypeScript/pull/40002
export type InferShapeOfDef<Def extends Definition> = {
    [K in keyof Def]?: InferValueOfType<Def[K]>
} &
    {
        [L in keyof RequiredKeys<Def>]-?: InferValueOfType<Def[L]>
    }
