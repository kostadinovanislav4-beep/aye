import { MODULE } from '../../app/modules'
import { PlaceholderPage } from '../../components/PlaceholderPage'
import { InstallHint } from './InstallHint'

export default function DashboardPage() {
  return (
    <>
      <InstallHint />
      <PlaceholderPage module={MODULE.dashboard} />
    </>
  )
}
