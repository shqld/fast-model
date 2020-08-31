/* eslint-disable @typescript-eslint/ban-ts-comment */
import Ajv from 'ajv'
import * as immer from 'immer'
import * as m from '../src'
import { init } from '../src'
import * as s from '../src/symbols'
import { InferValueOfType } from '../src/inference'

const ajv = new Ajv()

describe('extentions', () => {
    test('mutability', () => {
        const { model } = init({ immer, ajv })
        class B extends model({
            a: m.string(),
            o: m.object({ b: m.number() }),
        }) {}

        const b = new B({ a: 'aaa' })
        expect(b.a).toBe('aaa')

        // @ts-expect-error
        expect(() => (b.a = 'bbb')).toThrowErrorMatchingInlineSnapshot(
            `"Cannot assign to read only property 'a' of object '#<B>'"`
        )

        const c = B.produce(b, (draft) => {
            draft.a = 'xxx'
        })

        expect(c.a).toBe('xxx')
    })
})

describe('Model', () => {
    const ajv = new Ajv()

    const { model } = init({ ajv })

    describe('contains primitives', () => {
        describe('plain', () => {
            class M1 extends model({
                a: m.string(),
            }) {}

            test('construction', () => {
                const m1 = new M1({ a: 'aaa' })
                expect(m1).toMatchObject({ a: 'aaa' })
            })

            test('validation', () => {
                expect(() => M1.validate(1)).toThrow()
                expect(() => M1.validate({})).not.toThrow()
                expect(() => M1.validate({ a: 1 })).toThrow()
                expect(() => M1.validate({ a: '' })).not.toThrow()
            })

            test('raw construction', () => {
                expect(M1.raw({})).toMatchObject({})
                expect(M1.raw({ a: 'aaa' })).toMatchObject({ a: 'aaa' })
            })
        })

        describe('with required()', () => {
            class M1 extends model({
                a: m.string().required(),
            }) {}

            test('construction', () => {
                const m1 = new M1({ a: 'aaa' })
                expect(m1).toMatchObject({ a: 'aaa' })
            })

            test('validation', () => {
                expect(() => M1.validate(1)).toThrow()
                expect(() => M1.validate({})).toThrow()
                expect(() => M1.validate({ a: 1 })).toThrow()
                expect(() => M1.validate({ a: '' })).not.toThrow()
            })

            test('raw construction', () => {
                expect(() => M1.raw({})).toThrowErrorMatchingInlineSnapshot(
                    `"data should have required property 'a'"`
                )
                expect(M1.raw({ a: 'aaa' })).toMatchObject({ a: 'aaa' })
            })
            describe('with source()', () => {
                class M1 extends model({
                    a: m.string().source('x'),
                }) {}

                test('construction', () => {
                    const m1 = new M1({ a: 'aaa' })
                    expect(m1).toMatchObject({ a: 'aaa' })
                })

                test('validation', () => {
                    expect(() => M1.validate(1)).toThrow()
                    expect(() => M1.validate({})).not.toThrow()
                    expect(() => M1.validate({ a: 1 })).not.toThrow()
                    expect(() => M1.validate({ a: '' })).not.toThrow()
                    expect(() => M1.validate({ x: 1 })).toThrow()
                    expect(() => M1.validate({ x: '' })).not.toThrow()
                })

                test('raw construction', () => {
                    expect(M1.raw({})).toMatchObject({})
                    expect(M1.raw({ a: 'aaa', x: 'xxx' })).toMatchObject({
                        a: 'xxx',
                    })
                    expect(M1.raw({ a: 'aaa' })).toMatchObject({})
                })
            })

            describe('with required() & source()', () => {
                class M1 extends model({
                    a: m.string().source('x').required(),
                }) {}

                test('construction', () => {
                    const m1 = new M1({ a: 'aaa' })
                    expect(m1).toMatchObject({ a: 'aaa' })
                })

                test('validation', () => {
                    expect(() => M1.validate(1)).toThrow()
                    expect(() => M1.validate({})).toThrow()
                    expect(() => M1.validate({ a: 1 })).toThrow()
                    expect(() => M1.validate({ a: '' })).toThrow()
                    expect(() => M1.validate({ x: 1 })).toThrow()
                    expect(() => M1.validate({ x: '' })).not.toThrow()
                })

                test('raw construction', () => {
                    expect(() => M1.raw({})).toThrowErrorMatchingInlineSnapshot(
                        `"data should have required property 'x'"`
                    )
                    expect(() =>
                        M1.raw({ a: 'aaa' })
                    ).toThrowErrorMatchingInlineSnapshot(
                        `"data should have required property 'x'"`
                    )
                    expect(M1.raw({ a: 'aaa', x: 'xxx' })).toMatchObject({
                        a: 'xxx',
                    })
                })
            })
        })

        describe('contains models inside of a model', () => {
            class M1 extends model({
                a: m.string(),
            }) {}

            describe('plain', () => {
                class M2 extends model({
                    x: M1.type,
                }) {}

                test('construction', () => {
                    const m2 = new M2({ x: { a: 'aaa' } })
                    expect(m2).toMatchObject({ x: { a: 'aaa' } })
                })

                test.todo('validation')
            })

            describe('with required()', () => {
                class M2 extends model({
                    x: M1.type.required(),
                }) {}

                test('costruction', () => {
                    const m2 = new M2({ x: { a: 'aaa' } })
                    expect(m2).toMatchObject({ x: { a: 'aaa' } })
                })

                test('validation', () => {
                    expect(() =>
                        M2.validate({})
                    ).toThrowErrorMatchingInlineSnapshot(
                        `"data should have required property 'x'"`
                    )
                    expect(() =>
                        M2.validate({ x: 1 })
                    ).toThrowErrorMatchingInlineSnapshot(
                        `"data.x should be object"`
                    )
                    expect(() =>
                        M2.validate({ x: { a: 1 } })
                    ).toThrowErrorMatchingInlineSnapshot(
                        `"data.x.a should be string"`
                    )
                })
            })
        })

        describe('extends a model', () => {
            const { model } = init({ ajv })

            class M1 extends model({
                a: m.string(),
            }) {}

            class M2 extends M1.extend({
                b: m.number(),
            }) {}

            test('construction', () => {
                const m2 = new M2({ a: 'aaa', b: 1 })
                expect(m2).toMatchObject({ a: 'aaa', b: 1 })
            })

            test('validation', () => {
                expect(() => M2.validate(1)).toThrow()
                expect(() => M2.validate({})).not.toThrow()
                expect(() => M2.validate({ a: 2 })).toThrow()
                expect(() => M2.validate({ a: '' })).not.toThrow()
                expect(() => M2.validate({ a: '', b: '' })).toThrow()
                expect(() => M2.validate({ a: '', b: 1 })).not.toThrow()
            })

            test('raw construction', () => {
                expect(M2.raw({})).toMatchObject({})
                expect(M2.raw({ a: 'aaa' })).toMatchObject({ a: 'aaa' })
                expect(M2.raw({ a: 'aaa', b: 1 })).toMatchObject({
                    a: 'aaa',
                    b: 1,
                })
            })
        })
    })
})

describe('types', () => {
    describe('array', () => {
        test('primitive', () => {
            const type = m.array(m.string())

            expect(type[s.__schema]).toMatchInlineSnapshot(`
                Object {
                  "items": Object {
                    "type": "string",
                  },
                  "type": "array",
                }
            `)
        })

        test('object', () => {
            const type = m.array(m.object({ a: m.string() }))

            expect(type[s.__schema]).toMatchInlineSnapshot(`
                Object {
                  "items": Object {
                    "properties": Object {
                      "a": Object {
                        "type": "string",
                      },
                    },
                    "required": Array [],
                    "type": "object",
                  },
                  "type": "array",
                }
            `)
        })

        test('model', () => {
            const { model } = init({ ajv: new Ajv() })

            const m1 = model({
                a: m.string(),
            })

            const type = m.array(m1.type)

            expect(type[s.__schema]).toMatchObject({
                type: 'array',
                items: {},
            })
            expect(type[s.__schema].items).toHaveProperty(
                '$ref',
                m1.type[s.__schema].$ref
            )
        })

        describe('multiple item candidates', () => {
            test('primitive', () => {
                const type = m.array(m.anyOf(m.string(), m.number()))

                expect(type[s.__schema]).toMatchInlineSnapshot(`
                    Object {
                      "items": Object {
                        "anyOf": Array [
                          Object {
                            "type": "string",
                          },
                          Object {
                            "type": "number",
                          },
                        ],
                      },
                      "type": "array",
                    }
                `)
            })
        })
    })

    describe('object', () => {
        test('plain', () => {
            const type = m.object({
                a: m.string(),
            })

            expect(type[s.__schema]).toMatchInlineSnapshot(`
                Object {
                  "properties": Object {
                    "a": Object {
                      "type": "string",
                    },
                  },
                  "required": Array [],
                  "type": "object",
                }
            `)
        })

        test('with required()', () => {
            const type = m.object({
                a: m.string().required(),
            })

            expect(type[s.__schema]).toMatchInlineSnapshot(`
                Object {
                  "properties": Object {
                    "a": Object {
                      "type": "string",
                    },
                  },
                  "required": Array [
                    "a",
                  ],
                  "type": "object",
                }
            `)
        })

        test('nested', () => {
            const type = m.object({
                o: m
                    .object({
                        a: m.string().required(),
                    })
                    .required(),
            })

            expect(type[s.__schema]).toMatchInlineSnapshot(`
                Object {
                  "properties": Object {
                    "o": Object {
                      "properties": Object {
                        "a": Object {
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "a",
                      ],
                      "type": "object",
                    },
                  },
                  "required": Array [
                    "o",
                  ],
                  "type": "object",
                }
            `)
        })
    })

    test('anyOf', () => {
        const type = m.anyOf(
            m.string(),
            m.number(),
            m.object({ a: m.boolean() })
        )

        expect(type[s.__schema]).toMatchInlineSnapshot(`
            Object {
              "anyOf": Array [
                Object {
                  "type": "string",
                },
                Object {
                  "type": "number",
                },
                Object {
                  "properties": Object {
                    "a": Object {
                      "type": "boolean",
                    },
                  },
                  "required": Array [],
                  "type": "object",
                },
              ],
            }
        `)

        const type2 = m.object({ a: m.anyOf(m.string(), m.number()) })

        expect(type2[s.__schema]).toMatchInlineSnapshot(`
            Object {
              "properties": Object {
                "a": Object {
                  "anyOf": Array [
                    Object {
                      "type": "string",
                    },
                    Object {
                      "type": "number",
                    },
                  ],
                },
              },
              "required": Array [],
              "type": "object",
            }
        `)
    })
})
