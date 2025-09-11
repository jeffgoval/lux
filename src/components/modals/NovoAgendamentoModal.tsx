import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface NovoAgendamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
  selectedTime?: string
}

export function NovoAgendamentoModal({ open, onOpenChange, selectedDate, selectedTime }: NovoAgendamentoModalProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate)
  const [time, setTime] = useState(selectedTime || "")
  const [cliente, setCliente] = useState("")
  const [servico, setServico] = useState("")
  const [medico, setMedico] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const { toast } = useToast()

  const horarios = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00"
  ]

  const clientes = [
    "Maria Silva",
    "Ana Costa",
    "João Santos",
    "Carla Oliveira",
    "Pedro Almeida"
  ]

  const servicos = [
    "Limpeza de Pele",
    "Botox",
    "Preenchimento",
    "Peeling Químico",
    "Microagulhamento"
  ]

  const medicos = [
    "Dr. Carlos Silva",
    "Dra. Marina Costa",
    "Dr. Roberto Santos"
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!date || !time || !cliente || !servico || !medico) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    // Aqui você implementaria a lógica para salvar o agendamento
    toast({
      title: "Agendamento criado",
      description: "O agendamento foi criado com sucesso.",
    })

    // Reset form
    setDate(undefined)
    setTime("")
    setCliente("")
    setServico("")
    setMedico("")
    setObservacoes("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="heading-premium">Novo Agendamento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Selecionar horário" />
                </SelectTrigger>
                <SelectContent>
                  {horarios.map((horario) => (
                    <SelectItem key={horario} value={horario}>
                      {horario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente *</Label>
            <Select value={cliente} onValueChange={setCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((clienteItem) => (
                  <SelectItem key={clienteItem} value={clienteItem}>
                    {clienteItem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="servico">Serviço *</Label>
            <Select value={servico} onValueChange={setServico}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar serviço" />
              </SelectTrigger>
              <SelectContent>
                {servicos.map((servicoItem) => (
                  <SelectItem key={servicoItem} value={servicoItem}>
                    {servicoItem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medico">Médico *</Label>
            <Select value={medico} onValueChange={setMedico}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar médico" />
              </SelectTrigger>
              <SelectContent>
                {medicos.map((medicoItem) => (
                  <SelectItem key={medicoItem} value={medicoItem}>
                    {medicoItem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o agendamento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="premium">
              Criar Agendamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}