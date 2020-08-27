import * as m from '../src/model'
import { fm } from '../src/model'
import Ajv from 'ajv'

describe('Model', () => {
    const ajv = new Ajv()

    const { model } = fm(ajv)

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
            expect(M2.raw({ a: 'aaa', b: 1 })).toMatchObject({ a: 'aaa', b: 1 })
        })
    })
})