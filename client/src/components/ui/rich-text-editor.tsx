import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Maximize2,
  Undo,
  Redo
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
        
        <div className="mx-1 h-6 w-px bg-gray-300" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <div className="mx-1 h-6 w-px bg-gray-300" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
        
        <div className="mx-1 h-6 w-px bg-gray-300" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="mx-1 h-6 w-px bg-gray-300" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            const url = window.prompt('Enter URL');
            if (url) {
              editor.chain().focus().toggleLink({ href: url }).run();
            }
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const formData = new FormData();
                formData.append('image', file);
                
                try {
                  const response = await fetch('/api/upload/image', {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    editor.chain().focus().setImage({ src: result.url }).run();
                  }
                } catch (error) {
                  console.error('Image upload failed:', error);
                }
              }
            };
            input.click();
          }}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Editor Content */}
      <div className="min-h-[200px]">
        <EditorContent 
          editor={editor} 
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}