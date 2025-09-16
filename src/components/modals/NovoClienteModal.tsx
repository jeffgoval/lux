import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/ui/file-upload"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useCliente } from "@/hooks/useCliente"
import { useNotificationSystem } from "@/hooks/useNotificationSystem"
import { clienteSchema, type ClienteFormData } from "@/schemas/cliente.schema"
import { Cliente } from "@/types/cliente"
import { FileText } from "lucide-react"

interface NovoClienteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente
  isEdit?: boolean
  onSuccess?: (cliente: Cliente) => void
}

export function NovoClienteModal({ open, onOpenChange, cliente, isEdit = false, onSuccess }: NovoClienteModalProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(cliente?.foto || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { error: showError } = useNotificationSystem()
  
  const { 
    createCliente, 
    updateCliente, 
    uploadAvatar, 
    uploadDocument,
    creating,
    updating,
    uploadingAvatar, 
    uploadingDocument,
    checkEmailExists 
  } = useCliente({
    onSuccess: (newCliente: Cliente) => {
      onSuccess?.(newCliente)
      onOpenChange(false)
      reset()
      setAvatarFile(null)
      setDocumentFiles([])
      setCurrentAvatar(null)
      setIsSubmitting(false)
    }
  })

  // Form setup with validation
  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      cpf: "",
      dataNascimento: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      profissao: "",
      estadoCivil: undefined,
      categoria: undefined,
      observacoes: "",
      consentimento: false,
      marketing: false,
    }
  })

  const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch, setError, clearErrors, trigger } = form

  // Load client data when editing
  useEffect(() => {
    if (cliente && isEdit) {
      // Pre-populate form with existing client data
      setValue("nome", cliente.nome || "")
      setValue("email", cliente.email || "")
      setValue("telefone", cliente.telefone || "")
      setValue("cpf", cliente.cpf || "")
      setValue("dataNascimento", cliente.dataNascimento ? new Date(cliente.dataNascimento).toISOString().split('T')[0] : "")
      
      // Handle address data - check if endereco is string or object
      if (typeof cliente.endereco === 'string') {
        setValue("endereco", cliente.endereco)
      } else if (cliente.endereco && typeof cliente.endereco === 'object') {
        setValue("endereco", cliente.endereco.rua || "")
        setValue("cidade", cliente.endereco.cidade || "")
        setValue("estado", cliente.endereco.estado || "")
        setValue("cep", cliente.endereco.cep || "")
      }
      
      setValue("categoria", cliente.categoria as any)
      setValue("observacoes", cliente.observacoes || "")
      setValue("consentimento", true) // Assume consent was given previously
      setValue("marketing", false) // Default to false for marketing
      
      // Set current avatar
      setCurrentAvatar(cliente.foto || null)
      
      // Clear file selections for edit mode
      setAvatarFile(null)
      setDocumentFiles([])
    } else if (!isEdit) {
      // Reset form for new client
      reset()
      setCurrentAvatar(null)
      setAvatarFile(null)
      setDocumentFiles([])
    }
  }, [cliente, isEdit, setValue, reset])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false)
      if (!isEdit) {
        reset()
        setCurrentAvatar(null)
        setAvatarFile(null)
        setDocumentFiles([])
      }
    }
  }, [open, isEdit, reset])

  // Email validation with debounce for real-time checking
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    
    // Clear previous timeout
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout)
    }

    // Clear previous email errors
    if (errors.email?.message === "Este email já está em uso por outro cliente") {
      clearErrors("email")
    }

    // Skip validation if email is empty (since it's optional now)
    if (!email || email.trim() === '') {
      return
    }

    // Basic email format validation
    if (email && !validateEmail(email)) {
      setError("email", {
        type: "manual",
        message: "Formato de email inválido"
      })
      return
    }

    // Debounced duplicate check
    if (email && email !== cliente?.email && validateEmail(email)) {
      const timeout = setTimeout(async () => {
        setIsCheckingEmail(true)
        try {
          const exists = await checkEmailExists(email, cliente?.id)
          if (exists) {
            setError("email", { 
              type: "manual", 
              message: "Este email já está em uso por outro cliente" 
            })
          }
        } catch (error) {
          console.error('Error checking email:', error)
        } finally {
          setIsCheckingEmail(false)
        }
      }, 500) // 500ms debounce

      setEmailCheckTimeout(timeout)
    }
  }

  const handleEmailBlur = async (email: string) => {
    // Skip validation if email is empty (since it's optional now)
    if (!email || email.trim() === '') {
      return
    }

    // Final validation on blur if not already checked
    if (email && email !== cliente?.email && validateEmail(email) && !isCheckingEmail) {
      try {
        setIsCheckingEmail(true)
        const exists = await checkEmailExists(email, cliente?.id)
        if (exists) {
          setError("email", { 
            type: "manual", 
            message: "Este email já está em uso por outro cliente" 
          })
        }
      } catch (error) {
        console.error('Error checking email:', error)
      } finally {
        setIsCheckingEmail(false)
      }
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout)
      }
    }
  }, [emailCheckTimeout])

  // Handle form submission
  const onSubmit = async (data: ClienteFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      // Validate form before submission
      const isFormValid = await trigger()
      if (!isFormValid) {
        showError('Por favor, corrija os erros no formulário antes de continuar')
        setIsSubmitting(false)
        return
      }

      let savedCliente: Cliente | null = null

      if (isEdit && cliente) {
        // Update existing client - merge with existing data
        const updateData = {
          id: cliente.id,
          ...data,
          // Preserve existing data that might not be in the form
          ltv: cliente.ltv,
          frequencia: cliente.frequencia,
          ultimoAtendimento: cliente.ultimoAtendimento,
          proximoAgendamento: cliente.proximoAgendamento,
          nps: cliente.nps,
          tags: cliente.tags,
          documentos: cliente.documentos,
        }
        savedCliente = await updateCliente(cliente.id, updateData)
      } else {
        // Create new client
        savedCliente = await createCliente(data)
      }

      if (savedCliente) {
        // Upload avatar if provided
        if (avatarFile) {
          try {
            await uploadAvatar(savedCliente.id, avatarFile)
          } catch (error) {
            console.error('Error uploading avatar:', error)
            showError('Cliente salvo, mas houve erro ao enviar a foto')
          }
        }

        // Upload documents if provided
        for (const file of documentFiles) {
          try {
            await uploadDocument(savedCliente.id, file, 'document')
          } catch (error) {
            console.error('Error uploading document:', error)
            showError(`Cliente salvo, mas houve erro ao enviar o documento: ${file.name}`)
          }
        }
      }
    } catch (error) {
      console.error('Error saving client:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar cliente'
      showError(errorMessage)
      setIsSubmitting(false)
    }
  }

  // Handle avatar selection
  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file)
    setCurrentAvatar(URL.createObjectURL(file))
  }

  // Handle avatar removal
  const handleAvatarRemove = () => {
    setAvatarFile(null)
    setCurrentAvatar(null)
  }

  // Handle document selection
  const handleDocumentSelect = (file: File) => {
    setDocumentFiles(prev => [...prev, file])
  }

  // Handle document removal
  const handleDocumentRemove = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Format phone number
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  // Format CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Format CEP
  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-premium">
            {isEdit ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
            <TabsTrigger value="adicionais">Adicionais</TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    {...register("nome")}
                    placeholder="Nome completo do cliente"
                    className={errors.nome ? "border-red-500" : ""}
                  />
                  {errors.nome && (
                    <p className="text-sm text-red-500">{errors.nome.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        // Call the original register onChange
                        register("email").onChange(e)
                        // Call our custom validation
                        handleEmailChange(e)
                      }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleEmailBlur(e.target.value)}
                      placeholder="email@exemplo.com"
                      className={errors.email ? "border-red-500" : isCheckingEmail ? "border-yellow-500" : ""}
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <LoadingSpinner className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                  {isCheckingEmail && (
                    <p className="text-sm text-yellow-600">Verificando disponibilidade do email...</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    {...register("telefone")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const formatted = formatPhone(e.target.value)
                      setValue("telefone", formatted)
                    }}
                    placeholder="(11) 99999-9999"
                    className={errors.telefone ? "border-red-500" : ""}
                  />
                  {errors.telefone && (
                    <p className="text-sm text-red-500">{errors.telefone.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    {...register("cpf")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const formatted = formatCPF(e.target.value)
                      setValue("cpf", formatted)
                    }}
                    placeholder="000.000.000-00"
                    className={errors.cpf ? "border-red-500" : ""}
                  />
                  {errors.cpf && (
                    <p className="text-sm text-red-500">{errors.cpf.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    {...register("dataNascimento")}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select 
                    value={watch("categoria")} 
                    onValueChange={(value: string) => setValue("categoria", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  {...register("endereco")}
                  placeholder="Rua, número, bairro"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    {...register("cidade")}
                    placeholder="Cidade"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    {...register("estado")}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    {...register("cep")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const formatted = formatCEP(e.target.value)
                      setValue("cep", formatted)
                    }}
                    placeholder="00000-000"
                    className={errors.cep ? "border-red-500" : ""}
                  />
                  {errors.cep && (
                    <p className="text-sm text-red-500">{errors.cep.message}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="arquivos" className="space-y-4 mt-4">
              <div className="space-y-6">
                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label>Foto do Cliente</Label>
                  <div className="flex items-center space-x-4">
                    <FileUpload
                      variant="avatar"
                      onFileSelect={handleAvatarSelect}
                      onFileRemove={handleAvatarRemove}
                      currentFile={currentAvatar || avatarFile || undefined}
                      accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] }}
                      maxSize={5 * 1024 * 1024} // 5MB
                      loading={uploadingAvatar}
                      placeholder="Clique para adicionar foto"
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>Formatos aceitos: PNG, JPG, JPEG, GIF</p>
                      <p>Tamanho máximo: 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Document Upload */}
                <div className="space-y-2">
                  <Label>Documentos</Label>
                  <FileUpload
                    variant="document"
                    onFileSelect={handleDocumentSelect}
                    accept={{ 
                      'application/pdf': ['.pdf'],
                      'image/*': ['.png', '.jpg', '.jpeg'],
                      'application/msword': ['.doc'],
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
                    }}
                    maxSize={10 * 1024 * 1024} // 10MB
                    loading={uploadingDocument}
                    placeholder="Clique para adicionar documentos"
                  />
                  
                  {/* Document List */}
                  {documentFiles.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <Label className="text-sm">Documentos selecionados:</Label>
                      {documentFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({Math.round(file.size / 1024)}KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDocumentRemove(index)}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="adicionais" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input
                    id="profissao"
                    {...register("profissao")}
                    placeholder="Profissão"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estadoCivil">Estado Civil</Label>
                  <Select 
                    value={watch("estadoCivil")} 
                    onValueChange={(value: string) => setValue("estadoCivil", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  {...register("observacoes")}
                  placeholder="Observações sobre o cliente..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="consentimento"
                    checked={watch("consentimento")}
                    onCheckedChange={(checked: boolean) => setValue("consentimento", checked)}
                  />
                  <Label htmlFor="consentimento" className="text-sm">
                    Aceito os termos de consentimento para tratamento de dados
                  </Label>
                </div>
                {errors.consentimento && (
                  <p className="text-sm text-red-500">{errors.consentimento.message}</p>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="marketing"
                    checked={watch("marketing")}
                    onCheckedChange={(checked: boolean) => setValue("marketing", checked)}
                  />
                  <Label htmlFor="marketing" className="text-sm">
                    Aceito receber comunicações de marketing
                  </Label>
                </div>
              </div>
            </TabsContent>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || creating || updating}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="premium"
                disabled={isSubmitting || creating || updating || uploadingAvatar || uploadingDocument || !watch("nome")?.trim()}
              >
                {(isSubmitting || creating || updating) && <LoadingSpinner className="w-4 h-4 mr-2" />}
                {isEdit ? "Atualizar Cliente" : "Criar Cliente"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}