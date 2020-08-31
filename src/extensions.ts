import type ajv from 'ajv'
import type * as immer from 'immer'

import type { Definition, JSONSchema } from './types'
import type { Options, Model } from './model'
import { InferShapeOfDef } from './inference'

export type Ajv = Pick<ajv.Ajv, 'compile' | 'errorsText'> & {
    addSchema(schema: JSONSchema): void
}
export type Immer = Pick<typeof immer, 'produce' | 'immerable'>

export interface Extensions {
    extend(def: ElementDefinitionOptions): Extensions
    validate(obj: unknown): void
    produce: Function
}

export type InferExtensionsByOptions<
    Def extends Definition,
    Opts extends Options,
    Shape = Opts['immer'] extends Immer
        ? Readonly<InferShapeOfDef<Def>>
        : InferShapeOfDef<Def>
> = Model<Def, Shape> & {
    extend<ExtendedDef extends Definition>(
        def: ExtendedDef
    ): InferExtensionsByOptions<ExtendedDef & Def, Opts>
} & (Opts['ajv'] extends Ajv
        ? {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              validate(obj: any): obj is Shape
              extend<ExtendedDef extends Definition>(
                  def: ExtendedDef
              ): InferExtensionsByOptions<ExtendedDef & Def, Opts>
          }
        : {}) &
    (Opts['immer'] extends Immer
        ? {
              produce: Immer['produce'] &
                  (<T extends Shape>(
                      base: T,
                      updater: (draft: T) => T
                  ) => Shape)
              extend<ExtendedDef extends Definition>(
                  def: ExtendedDef
              ): InferExtensionsByOptions<ExtendedDef & Def, Opts>
          }
        : {})
