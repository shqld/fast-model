import * as t from './src'
import { Data } from './src/data'
import { allOf, anyOf, not } from './src/combination'

const any = null as any

{
    const a = t
        .array()
        .items(t.number())
        .enum([1] as const)
    const b: Data<typeof a>
}
{
    const a = t.string().const('asdf' as const)
    const b: t.Data<typeof a>
}

{
    const a = t
        .object()
        .props({
            a: t.number(),
        })
        .required('a')
        // .object({ a: t.number() })
        .props({ x: t.string() })
        // TODO: pitfalls
        // .enum({ a: 1 } as const, { a: 2 } as const)
        // .required(['x'])
        .required('x')
    const b: t.Data<typeof a>
}

{
    const a = t.object({
        a: t.number(),
    })
    const b: t.Data<typeof a>
    let c = b.a
    c
}

{
    // FIXME: This should be never
    const a = allOf(
        t.object().props({ c: t.boolean() }),
        t.object({ a: t.number() }),
        t.object({ b: t.string() }).required('b'),
        t.string()
    )
    let c: typeof a
    const b: t.Data<typeof a>
}

{
    const a = anyOf(
        // t.number(),
        // t.string().enum('aaa'),
        t.array(t.boolean()),
        // t.object({ b: t.string() }),
        t.object().props({ b: t.string() }),
        t.object().props({ a: t.number() }).required('a')
    )
    const b: t.Data<typeof a> = any
}

{
    const a = not(
        t.number()
        // t.string().enum('aaa')
        // t.array(t.boolean())
        // t.object({ b: t.string() })
        // t.object().props({ b: t.string() }),
        // t.object().props({ a: t.number() }).required('a')
    )
    const b: t.Data<typeof a>
}
