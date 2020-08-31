import type ajv from 'ajv'
import type { produce } from 'immer'

import type { Definition, JSONSchema } from './types'
import type { Options, Model } from './model'

import { InferShapeOfDef } from './inference'

export { ValidationError } from 'ajv'
export { immerable } from 'immer'

export interface Extensions {
    extend(def: ElementDefinitionOptions): Extensions
    validate(obj: unknown): void
    produce: Function
}

type Ajv = Pick<ajv.Ajv, 'compile' | 'errorsText'> & {
    // need a work around with loose type annotation
    // since different sources of Ajv could be treated as imcompatible
    // even when they have same version
    addSchema(schema: JSONSchema): void
}
export interface ExtensionOptions {
    ajv?: Ajv
    immer?: typeof produce
}

export type InferExtensionsByOptions<
    Def extends Definition,
    Opts extends Options,
    Shape = Opts['immer'] extends typeof produce
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
    (Opts['immer'] extends typeof produce
        ? {
              produce: typeof produce &
                  (<T extends Shape>(
                      base: T,
                      updater: (draft: T) => T
                  ) => Shape)
              extend<ExtendedDef extends Definition>(
                  def: ExtendedDef
              ): InferExtensionsByOptions<ExtendedDef & Def, Opts>
          }
        : {})
