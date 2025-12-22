import { getPayloadSingleton } from '@/lib/payload-singleton'

export const GET = async () => {
  const payload = await getPayloadSingleton()

  const data = await payload.find({
    collection: "categories",
  })

  return Response.json(data)
}
// https://localhost:3000/my-route