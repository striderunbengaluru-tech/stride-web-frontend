declare module 'react-qr-scanner' {
  import type { ComponentType, CSSProperties } from 'react'

  type QrScanData = {
    text: string
    canvas: HTMLCanvasElement
  }

  type QrScannerProps = {
    onScan: (data: QrScanData | null) => void
    onError: (error: Error) => void
    constraints?: MediaStreamConstraints
    style?: CSSProperties
    className?: string
    facingMode?: 'user' | 'environment'
    resolution?: number
  }

  const QrScanner: ComponentType<QrScannerProps>
  export default QrScanner
}
