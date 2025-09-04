import { useState } from 'react'
import { Calculator, Plus, Trash2, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { ThemeToggle } from './components/ThemeToggle.jsx'
import './App.css'

function App() {
  const [modelo, setModelo] = useState({
    nome: '',
    tempo: 0,
    peso: 0
  })

  const [custos, setCustos] = useState({
    materiaPrima: '',
    custoMateriaPrima: 0
  })

  const [impressora, setImpressora] = useState({
    nome: '',
    potencia: 0
  })

  const [energia, setEnergia] = useState({
    custoKwh: 0
  })

  const [acessorios, setAcessorios] = useState([])

  const [custoFixo, setCustoFixo] = useState({
    valor: 0,
    unidadesPorMes: 0
  })

  const [precificacao, setPrecificacao] = useState({
    unidades: 1,
    imposto: 8.0,
    txCartao: 5.0,
    custoAnuncio: 20.0
  })

  const [pecas, setPecas] = useState([])

  const adicionarAcessorio = () => {
    setAcessorios([...acessorios, { nome: '', quantidade: 0, custoUnitario: 0 }])
  }

  const removerAcessorio = (index) => {
    setAcessorios(acessorios.filter((_, i) => i !== index))
  }

  const atualizarAcessorio = (index, campo, valor) => {
    const novosAcessorios = [...acessorios]
    novosAcessorios[index][campo] = valor
    setAcessorios(novosAcessorios)
  }

  const handleGcodeUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const gcodeContent = e.target.result
        parseGcode(gcodeContent)
      }
      reader.readAsText(file)
    }
  }

  const parseGcode = (content) => {
    let totalExtrusion = 0
    let printTime = 0
    const lines = content.split('\n')

    for (const line of lines) {
      const timeMatch = line.match(/; estimated printing time \(s\) = (\d+\.?\d*)/i)
      if (timeMatch && timeMatch[1]) {
        printTime = parseFloat(timeMatch[1]) / 3600 // Convert seconds to hours
      }

      const eMatch = line.match(/E([\d\.-]+)/)
      if (eMatch && eMatch[1]) {
        const eValue = parseFloat(eMatch[1])
        if (eValue > 0) {
          totalExtrusion += eValue
        }
      }
    }

    const estimatedWeight = (totalExtrusion / 1000) * 2.5 // Rough estimate for PLA

    setModelo(prevModelo => ({
      ...prevModelo,
      tempo: printTime > 0 ? printTime : prevModelo.tempo,
      peso: estimatedWeight > 0 ? estimatedWeight : prevModelo.peso
    }))
  }

  // Cálculos
  const custoMateria = (custos.custoMateriaPrima / 1000) * modelo.peso
  const gastoEnergetico = modelo.tempo * impressora.potencia * 0.5
  const custoEnergia = gastoEnergetico * energia.custoKwh
  const custoAcessoriosTotal = acessorios.reduce((total, acc) => total + (acc.quantidade * acc.custoUnitario), 0)
  const custoFixoPorPeca = custoFixo.unidadesPorMes > 0 ? custoFixo.valor / custoFixo.unidadesPorMes : 0
  const falhas = 0.15 // 15%
  
  // Custo Total = Custo Matéria + Custo Energia + Custo Acessórios + Custo Fixo por Peça
  const custoTotal = custoMateria + custoEnergia + custoAcessoriosTotal + custoFixoPorPeca
  
  // Custo c/ Falhas = Custo Total * (1 + % Falhas)
  const custoTotalComFalhas = custoTotal * (1 + falhas)
  
  // Custo Un. = Custo c/ Falhas / Unidades por Fornada
  const custoUn = precificacao.unidades > 0 ? custoTotalComFalhas / precificacao.unidades : 0

  // Preços
  // Preço Consumidor Final = Custo Un. * Markup 5
  const precoConsumidorFinal = custoUn * 5
  // Preço Lojista = Custo Un. * Markup 3
  const precoLojista = custoUn * 3

  // Lucros Consumidor Final
  // Total Impostos Consumidor = Preço Consumidor Final * (Imposto + Taxa Cartão + Custo Anúncio) / 100
  const totalImpostosConsumidor = precoConsumidorFinal * ((precificacao.imposto + precificacao.txCartao + precificacao.custoAnuncio) / 100)
  // Lucro Bruto Consumidor = Preço Consumidor Final - Custo Un.
  const lucroBrutoConsumidor = precoConsumidorFinal - custoUn
  // Lucro Líquido Consumidor = Lucro Bruto Consumidor - Total Impostos Consumidor
  const lucroLiquidoConsumidor = lucroBrutoConsumidor - totalImpostosConsumidor

  // Lucros Lojista
  // Total Impostos Lojista = Preço Lojista * (Imposto + Taxa Cartão) / 100
  const totalImpostosLojista = precoLojista * ((precificacao.imposto + precificacao.txCartao) / 100)
  // Lucro Bruto Lojista = Preço Lojista - Custo Un.
  const lucroBrutoLojista = precoLojista - custoUn
  // Lucro Líquido Lojista = Lucro Bruto Lojista - Total Impostos Lojista
  const lucroLiquidoLojista = lucroBrutoLojista - totalImpostosLojista

  const adicionarPeca = () => {
    if (!modelo.nome) return
    
    const novaPeca = {
      nome: modelo.nome,
      categoria: 'Impressão 3D',
      precoConsumidor: precoConsumidorFinal,
      precoLojista: precoLojista,
      custoUn: custoUn
    }
    
    setPecas([...pecas, novaPeca])
    
    // Limpar formulário
    setModelo({ nome: '', tempo: 0, peso: 0 })
    setCustos({ materiaPrima: '', custoMateriaPrima: 0 })
    setImpressora({ nome: '', potencia: 0 })
    setEnergia({ custoKwh: 0 })
    setAcessorios([])
    setCustoFixo({ valor: 0, unidadesPorMes: 0 })
    setPrecificacao({ unidades: 1, imposto: 8.0, txCartao: 5.0, custoAnuncio: 20.0 })
  }

  const exportarCSV = () => {
    if (pecas.length === 0) return
    
    const headers = ['Nome', 'Categoria', 'Preço Consumidor Final', 'Preço Lojista', 'Custo Unitário']
    const csvContent = [
      headers.join(','),
      ...pecas.map(peca => [
        peca.nome,
        peca.categoria,
        peca.precoConsumidor.toFixed(2),
        peca.precoLojista.toFixed(2),
        peca.custoUn.toFixed(2)
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'calculadora-impressao-3d.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Calculadora de Custos - Impressão 3D</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <div className="space-y-6">
            {/* Modelo */}
            <Card>
              <CardHeader>
                <CardTitle>Modelo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nomeModelo">Nome do Modelo</Label>
                  <Input
                    id="nomeModelo"
                    value={modelo.nome}
                    onChange={(e) => setModelo({...modelo, nome: e.target.value})}
                    placeholder="Ex: Porta-canetas"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tempo">Tempo de Impressão (h)</Label>
                    <Input
                      id="tempo"
                      type="number"
                      value={modelo.tempo}
                      onChange={(e) => setModelo({...modelo, tempo: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="peso">Peso do Modelo (g)</Label>
                    <Input
                      id="peso"
                      type="number"
                      value={modelo.peso}
                      onChange={(e) => setModelo({...modelo, peso: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="gcodeUpload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" /> Upload G-code
                  </Label>
                  <Input
                    id="gcodeUpload"
                    type="file"
                    accept=".gcode"
                    onChange={handleGcodeUpload}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custos */}
            <Card>
              <CardHeader>
                <CardTitle>Custos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="materiaPrima">Matéria Prima</Label>
                  <Input
                    id="materiaPrima"
                    value={custos.materiaPrima}
                    onChange={(e) => setCustos({...custos, materiaPrima: e.target.value})}
                    placeholder="Ex: Filamento PLA"
                  />
                </div>
                <div>
                  <Label htmlFor="custoMateria">Custo da Matéria Prima (R$/kg)</Label>
                  <Input
                    id="custoMateria"
                    type="number"
                    value={custos.custoMateriaPrima}
                    onChange={(e) => setCustos({...custos, custoMateriaPrima: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Custo da Matéria: R$ {custoMateria.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Impressora */}
            <Card>
              <CardHeader>
                <CardTitle>Impressora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nomeImpressora">Impressora</Label>
                  <Input
                    id="nomeImpressora"
                    value={impressora.nome}
                    onChange={(e) => setImpressora({...impressora, nome: e.target.value})}
                    placeholder="Ex: Ender 3"
                  />
                </div>
                <div>
                  <Label htmlFor="potencia">Potência (W)</Label>
                  <Input
                    id="potencia"
                    type="number"
                    value={impressora.potencia}
                    onChange={(e) => setImpressora({...impressora, potencia: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="custoKwh">Custo kW/h (R$)</Label>
                  <Input
                    id="custoKwh"
                    type="number"
                    step="0.01"
                    value={energia.custoKwh}
                    onChange={(e) => setEnergia({...energia, custoKwh: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Gasto Energético: {gastoEnergetico.toFixed(2)} kWh<br />
                  Custo Energia: R$ {custoEnergia.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Acessórios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Acessórios e Embalagens
                  <Button onClick={adicionarAcessorio} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {acessorios.map((acessorio, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 items-end">
                    <div>
                      <Label>Acessório</Label>
                      <Input
                        value={acessorio.nome}
                        onChange={(e) => atualizarAcessorio(index, 'nome', e.target.value)}
                        placeholder="Nome"
                      />
                    </div>
                    <div>
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        value={acessorio.quantidade}
                        onChange={(e) => atualizarAcessorio(index, 'quantidade', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Custo Un.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={acessorio.custoUnitario}
                        onChange={(e) => atualizarAcessorio(index, 'custoUnitario', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removerAcessorio(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground">
                  Total Acessórios: R$ {custoAcessoriosTotal.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Custo Fixo */}
            <Card>
              <CardHeader>
                <CardTitle>Custo Fixo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="valorFixo">Valor Custo Fixo (R$)</Label>
                  <Input
                    id="valorFixo"
                    type="number"
                    value={custoFixo.valor}
                    onChange={(e) => setCustoFixo({...custoFixo, valor: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="unidadesMes">Unidades por Mês</Label>
                  <Input
                    id="unidadesMes"
                    type="number"
                    value={custoFixo.unidadesPorMes}
                    onChange={(e) => setCustoFixo({...custoFixo, unidadesPorMes: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Custo Fixo por Peça: R$ {custoFixoPorPeca.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Precificação */}
            <Card>
              <CardHeader>
                <CardTitle>Precificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="unidades">Unidades por Fornada</Label>
                  <Input
                    id="unidades"
                    type="number"
                    value={precificacao.unidades}
                    onChange={(e) => setPrecificacao({...precificacao, unidades: parseFloat(e.target.value) || 1})}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="imposto">Imposto (%)</Label>
                    <Input
                      id="imposto"
                      type="number"
                      step="0.1"
                      value={precificacao.imposto}
                      onChange={(e) => setPrecificacao({...precificacao, imposto: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="txCartao">Taxa Cartão (%)</Label>
                    <Input
                      id="txCartao"
                      type="number"
                      step="0.1"
                      value={precificacao.txCartao}
                      onChange={(e) => setPrecificacao({...precificacao, txCartao: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custoAnuncio">Custo Anúncio (%)</Label>
                    <Input
                      id="custoAnuncio"
                      type="number"
                      step="0.1"
                      value={precificacao.custoAnuncio}
                      onChange={(e) => setPrecificacao({...precificacao, custoAnuncio: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultados */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resultados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Custo Total:</strong> R$ {custoTotal.toFixed(2)}
                  </div>
                  <div>
                    <strong>% Falhas:</strong> 15%
                  </div>
                  <div>
                    <strong>Custo c/ Falhas:</strong> R$ {custoTotalComFalhas.toFixed(2)}
                  </div>
                  <div>
                    <strong>Custo Unitário:</strong> R$ {custoUn.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preço Consumidor Final (Markup 5x)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-primary">R$ {precoConsumidorFinal.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  Lucro Bruto: R$ {lucroBrutoConsumidor.toFixed(2)}<br />
                  Total Impostos: R$ {totalImpostosConsumidor.toFixed(2)}<br />
                  Lucro Líquido: R$ {lucroLiquidoConsumidor.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preço Lojista (Markup 3x)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-secondary">R$ {precoLojista.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  Lucro Bruto: R$ {lucroBrutoLojista.toFixed(2)}<br />
                  Total Impostos: R$ {totalImpostosLojista.toFixed(2)}<br />
                  Lucro Líquido: R$ {lucroLiquidoLojista.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={adicionarPeca} className="flex-1" disabled={!modelo.nome}>
                Adicionar Peça
              </Button>
            </div>

            {/* Lista de Peças */}
            {pecas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Peças Calculadas ({pecas.length})
                    <Button onClick={exportarCSV} size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pecas.map((peca, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium">{peca.nome}</div>
                          <div className="text-sm text-muted-foreground">{peca.categoria}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div>Consumidor: R$ {peca.precoConsumidor.toFixed(2)}</div>
                          <div>Lojista: R$ {peca.precoLojista.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App


