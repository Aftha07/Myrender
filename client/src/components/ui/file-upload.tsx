import { useRef } from 'react'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onFileSelect: (files: FileList | null) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // in MB
  className?: string
}

export function FileUpload({ 
  onFileSelect, 
  accept = "*/*", 
  multiple = false, 
  maxSize = 30,
  className = ""
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      // Check file sizes
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > maxSize * 1024 * 1024) {
          alert(`File "${file.name}" is too large. Maximum size is ${maxSize}MB.`)
          return
        }
      }
    }
    onFileSelect(files)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm text-gray-600 mb-2">
        Attachments ( Maximum size is {maxSize}MB )
      </div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            className="bg-white"
          >
            Choose Files
          </Button>
          <span className="text-sm text-gray-500">No file chosen</span>
        </div>
      </div>
    </div>
  )
}