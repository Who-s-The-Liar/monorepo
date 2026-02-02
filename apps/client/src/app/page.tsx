import { Button } from '@/components/ui/8bit/button'
import Link from 'next/link'

const Page = () => {
  return (
    <div className='min-h-screen flex items-center justify-center'><Link href="/playground"><Button>Click me</Button></Link></div>
  )
}

export default Page