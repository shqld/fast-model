import type * as Immer from 'immer'
import type ajv from 'ajv'

import type { Type, TypeCreator, Definition } from './types'
import { Model, Options } from './model'

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

export type InferModelByOptions<
    Def extends Definition,
    Opts extends Options | void
> = Opts extends Options
    ? Model<
          Def,
          Opts['immer'] extends typeof Immer
              ? Readonly<InferShapeOfDef<Def>>
              : InferShapeOfDef<Def>
      > & {
          extend<ExtendedDef extends Definition>(
              def: ExtendedDef
          ): InferModelByOptions<ExtendedDef & Def, Opts>
      } & (Opts['ajv'] extends ajv.Ajv
              ? {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    validate(obj: any): void
                    extend<ExtendedDef extends Definition>(
                        def: ExtendedDef
                    ): InferModelByOptions<ExtendedDef & Def, Opts>
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
                    ): InferModelByOptions<ExtendedDef & Def, Opts>
                }
              : {})
    : Model<Def> & {
          extend<ExtendedDef extends Definition>(
              def: ExtendedDef
          ): Model<ExtendedDef & Def>
      }
