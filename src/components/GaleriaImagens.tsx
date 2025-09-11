import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Camera, 
  Upload, 
  Eye, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  Lock,
  Shield,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import type { ImagemMedica, TipoImagem } from "@/types/prontuario";

export function GaleriaImagens() {
  const [imagens, setImagens] = useState<ImagemMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoImagem | "todos">("todos");
  const [activeTab, setActiveTab] = useState("galeria");

  useEffect(() => {
    carregarImagens();
  }, []);

  const carregarImagens = async () => {
    try {
      setLoading(true);
      // Simular carregamento de imagens
      setImagens([]);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      toast.error('Erro ao carregar galeria de imagens');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB
          toast.error(`${file.name} excede o limite de 50MB`);
          continue;
        }

        // Simular upload com validação
        const novaImagem: ImagemMedica = {
          id: `img-${Date.now()}-${Math.random()}`,
          sessao_id: "sessao-placeholder",
          tipo_imagem: "antes",
          url_criptografada: URL.createObjectURL(file),
          nome_arquivo_original: file.name,
          tamanho_bytes: file.size,
          mime_type: file.type,
          resolucao: "1920x1080",
          regiao_corporal: "Rosto",
          visivel_paciente: false,
          watermark_aplicado: true,
          capturada_em: new Date().toISOString(),
          capturada_por: "user-id",
          hash_imagem: `hash-${Date.now()}`
        };

        setImagens(prev => [novaImagem, ...prev]);
        toast.success(`${file.name} carregado com sucesso`);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload das imagens');
    }
  };

  const getTipoImagemLabel = (tipo: TipoImagem) => {
    const labels = {
      antes: "Antes",
      durante: "Durante",
      depois: "Depois",
      evolucao: "Evolução"
    };
    return labels[tipo];
  };

  const getTipoImagemVariant = (tipo: TipoImagem) => {
    const variants = {
      antes: "secondary",
      durante: "outline", 
      depois: "default",
      evolucao: "destructive"
    } as const;
    return variants[tipo];
  };

  const imagensFiltradas = imagens.filter(imagem => {
    const matchesSearch = imagem.nome_arquivo_original.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         imagem.regiao_corporal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filtroTipo === "todos" || imagem.tipo_imagem === filtroTipo;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Galeria de Imagens Médicas</h2>
          <p className="text-muted-foreground">
            Sistema seguro para armazenamento de imagens médicas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Camera className="h-4 w-4 mr-2" />
            Capturar
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload
            <input
              type="file"
              multiple
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="galeria">Galeria</TabsTrigger>
          <TabsTrigger value="comparacao">Comparação</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="galeria" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome do arquivo ou região..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select 
                  value={filtroTipo} 
                  onValueChange={(value: TipoImagem | "todos") => setFiltroTipo(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo de imagem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="antes">Antes</SelectItem>
                    <SelectItem value="durante">Durante</SelectItem>
                    <SelectItem value="depois">Depois</SelectItem>
                    <SelectItem value="evolucao">Evolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Grid de Imagens */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Carregando galeria...</div>
            </div>
          ) : imagensFiltradas.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">Nenhuma imagem encontrada</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || filtroTipo !== "todos" 
                      ? "Tente ajustar os filtros de busca"
                      : "Faça upload das primeiras imagens médicas"
                    }
                  </p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Fazer Upload
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleUpload(e.target.files)}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {imagensFiltradas.map((imagem) => (
                <Card key={imagem.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square relative">
                    <img
                      src={imagem.url_criptografada}
                      alt={imagem.nome_arquivo_original}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge variant={getTipoImagemVariant(imagem.tipo_imagem)}>
                        {getTipoImagemLabel(imagem.tipo_imagem)}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      {imagem.watermark_aplicado && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3" />
                        </Badge>
                      )}
                      {!imagem.visivel_paciente && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm truncate">
                        {imagem.nome_arquivo_original}
                      </h3>
                      <div className="text-xs text-muted-foreground">
                        <div>Região: {imagem.regiao_corporal}</div>
                        <div>Capturada: {new Date(imagem.capturada_em).toLocaleDateString('pt-BR')}</div>
                        <div>Tamanho: {Math.round(imagem.tamanho_bytes / 1024)} KB</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação Antes/Depois</CardTitle>
              <CardDescription>
                Compare imagens de diferentes momentos do tratamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">Ferramenta de Comparação</h3>
                <p className="text-muted-foreground">
                  Selecione imagens para comparar evolução dos tratamentos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>
                Configurações avançadas de segurança e privacidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Criptografia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Algoritmo:</span>
                        <span className="font-mono">AES-256</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant="default">Ativo</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Chaves rotacionadas:</span>
                        <span>Mensalmente</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Watermark</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Aplicação automática:</span>
                        <Badge variant="default">Habilitado</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Informações incluídas:</span>
                        <span>Clínica + Data</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transparência:</span>
                        <span>15%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Backup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Frequência:</span>
                        <span>Diário</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retenção:</span>
                        <span>90 dias</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Último backup:</span>
                        <Badge variant="default">Hoje</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>LGPD:</span>
                        <Badge variant="default">Conforme</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Auditoria:</span>
                        <Badge variant="default">Ativa</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Anonimização:</span>
                        <span>Automática</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}