//+------------------------------------------------------------------+
//| IA FX - MT5 (versao corrigida)                                   |
//| Scalper por velocidade de ticks                                  |
//| SL, TP e trailing por distancia real no preco                    |
//|                                                                  |
//| Correcoes aplicadas:                                             |
//|  1. Fuso: limites de dia/semana/mes convertidos para hora do     |
//|     servidor antes do HistorySelect (lucro do painel correto).   |
//|  2. Inicio de semana calculado por segundos (sem dia negativo).  |
//|  3. Velocidade medida em milissegundos (tick.time_msc).          |
//|  4. Buffer maior para cobrir a janela em mercado rapido.         |
//|  5-7. Travas diarias por resultado REALIZADO (balance).          |
//|  9. Checagem de trade permitido / terminal conectado.            |
//|  10. Bloqueio diario impede reabertura apos meta/stop.           |
//|  11. Aviso se o arquivo de som nao tocar.                        |
//+------------------------------------------------------------------+
#property strict
#include <Trade/Trade.mqh>
CTrade trade;
//==================== OPERACAO ====================//
input ulong    MagicNumber              = 20260705;
input double   LoteFixo                 = 0.01;
input int      MaxOrdensAbertas         = 1;
input int      JanelaVelocidadeSegundos = 2;
input double   MovimentoMinimoPontos    = 250.0;
//==================== SL E TP EM PRECO ====================//
// Exemplo no ouro:
// 0.50 = cinquenta centavos no preco
// 1.00 = um dolar no preco
input double   StopLossPreco            = 1.00;
input double   TakeProfitPreco          = 2.00;
//==================== TRAILING EM PRECO ====================//
input bool     UsarTrailingStop         = false;
input double   TrailingInicioPreco      = 0.50;
input double   TrailingDistanciaPreco   = 0.50;
//==================== EXECUCAO ====================//
input double   SpreadMaximoPontos       = 20.0;
input int      SlippageMaximoPontos     = 10;
input int      CooldownSegundos         = 10;
//==================== ALERTA SONORO ====================//
input bool     AlertaSonoro             = true;
input string   ArquivoSom               = "alert.wav";
input int      IntervaloAlertaSegundos  = 2;
//==================== HORARIO BRASIL ====================//
input bool     UsarHorarioBrasil        = true;
input int      HoraInicioBrasil         = 9;
input int      MinutoInicioBrasil       = 0;
input int      HoraFimBrasil            = 13;
input int      MinutoFimBrasil          = 0;
input int      OffsetBrasilUTC          = -3;
//==================== GESTAO EM $ ====================//
input bool     UsarMetaDiaria           = true;
input double   MetaDiariaValor          = 300.0;
input bool     UsarStopDiario           = true;
input double   StopDiarioValor          = 300.0;
input bool     FecharOrdensNoStopDiario = true;
input bool     PausarAposMetaOuStop     = true;
// true  = travas contam tambem o lucro/prejuizo FLUTUANTE (equity)
// false = travas contam apenas o resultado REALIZADO (balance)  <- recomendado
input bool     UsarEquityNasTravas      = false;
//==================== PAINEL ====================//
input bool     MostrarPainel            = true;
input int      PainelX                  = 20;
input int      PainelY                  = 30;
//==================== VARIAVEIS ====================//
datetime ultimaEntrada = 0;
datetime ultimoAlerta  = 0;
double baseInicialDia  = 0.0;   // balance (ou equity) no inicio do dia
int  diaAtualBrasil    = -1;
bool roboPausado       = false;
bool bloqueioDiario    = false; // impede novas entradas ate o proximo dia
bool avisouSom         = false;
#define BUFFER_SIZE 5000
double precoBuffer[BUFFER_SIZE];
long   tempoBufferMs[BUFFER_SIZE];   // timestamp do tick em milissegundos
int  bufferIndex = 0;
bool bufferCheio = false;
//+------------------------------------------------------------------+
//| Offset (segundos) entre hora do servidor e GMT                   |
//+------------------------------------------------------------------+
long ServidorMenosGMT()
{
   // TimeCurrent = hora do servidor; TimeGMT = GMT.
   // Arredonda para o minuto mais proximo para evitar ruido de leitura.
   double diff = (double)(TimeCurrent() - TimeGMT());
   return (long)(MathRound(diff / 60.0) * 60.0);
}
//+------------------------------------------------------------------+
//| Inicializacao                                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippageMaximoPontos);
   trade.SetTypeFillingBySymbol(_Symbol);
   trade.SetAsyncMode(false);
   ResetarDia();
   CriarPainel();
   Print("IA FX iniciado no ativo ", _Symbol);
   Print("POINT: ", DoubleToString(_Point, 8));
   Print("DIGITS: ", _Digits);
   Print("TICK SIZE: ",
         DoubleToString(
            SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE),
            8
         ));
   Print("Offset servidor-GMT (h): ",
         DoubleToString(ServidorMenosGMT() / 3600.0, 2));

   // Aviso de sanidade sobre o gatilho de movimento
   double movMinPreco = MovimentoMinimoPontos * _Point;
   Print("Movimento minimo para sinal: ",
         DoubleToString(MovimentoMinimoPontos, 1),
         " pontos (~",
         DoubleToString(movMinPreco, _Digits),
         " no preco em ",
         JanelaVelocidadeSegundos,
         "s). Ajuste se estiver alto/baixo demais para o ativo.");
   return INIT_SUCCEEDED;
}
//+------------------------------------------------------------------+
//| Remocao                                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   ObjectDelete(0, "PAINEL_BG");
   ObjectDelete(0, "PAINEL_TITULO");
   ObjectDelete(0, "PAINEL_SPREAD");
   ObjectDelete(0, "PAINEL_FREQ");
   ObjectDelete(0, "PAINEL_DIA");
   ObjectDelete(0, "PAINEL_SEMANA");
   ObjectDelete(0, "PAINEL_MES");
   ChartRedraw();
}
//+------------------------------------------------------------------+
//| Tick principal                                                   |
//+------------------------------------------------------------------+
void OnTick()
{
   AtualizarDia();
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return;
   SalvarTick(tick);
   VerificarAlertaSonoro();
   AtualizarPainel();
   GerenciarTrailing();
   VerificarTravasDiarias();
   if(roboPausado)
      return;
   if(bloqueioDiario)
      return;
   // Robustez: so opera se o terminal permitir negociacao
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
      return;
   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
      return;
   if(!AccountInfoInteger(ACCOUNT_TRADE_ALLOWED))
      return;
   if(!HorarioPermitido())
      return;
   if(SpreadAtualPontos() > SpreadMaximoPontos)
      return;
   if(TimeCurrent() - ultimaEntrada < CooldownSegundos)
      return;
   if(ContarOrdensAbertas() >= MaxOrdensAbertas)
      return;
   int sinal = SinalPorVelocidade();
   if(sinal == 1)
      AbrirCompra();
   if(sinal == -1)
      AbrirVenda();
}
//+------------------------------------------------------------------+
//| Normaliza o volume                                               |
//+------------------------------------------------------------------+
double NormalizarVolume(double volume)
{
   double minimo = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maximo = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double passo  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(passo <= 0.0)
      passo = minimo;
   volume = MathMax(minimo, MathMin(maximo, volume));
   volume = MathFloor(volume / passo + 0.0000001) * passo;
   int digitosVolume = 2;
   if(passo == 1.0)
      digitosVolume = 0;
   else if(passo == 0.1)
      digitosVolume = 1;
   else if(passo == 0.01)
      digitosVolume = 2;
   else if(passo == 0.001)
      digitosVolume = 3;
   return NormalizeDouble(volume, digitosVolume);
}
//+------------------------------------------------------------------+
//| Normaliza preco pelo tick size                                   |
//+------------------------------------------------------------------+
double NormalizarPreco(double preco)
{
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickSize <= 0.0)
      tickSize = _Point;
   preco = MathRound(preco / tickSize) * tickSize;
   return NormalizeDouble(preco, _Digits);
}
//+------------------------------------------------------------------+
//| Distancia minima aceita pela corretora                           |
//+------------------------------------------------------------------+
double DistanciaMinimaStops()
{
   long stopsLevel  = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   long freezeLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_FREEZE_LEVEL);
   long nivel = MathMax(stopsLevel, freezeLevel);
   double distancia = nivel * _Point;
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickSize <= 0.0)
      tickSize = _Point;
   distancia += tickSize;
   return distancia;
}
//+------------------------------------------------------------------+
//| Ajusta distancia solicitada                                      |
//+------------------------------------------------------------------+
double AjustarDistancia(double distancia)
{
   double minima = DistanciaMinimaStops();
   if(distancia < minima)
      distancia = minima;
   return distancia;
}
//+------------------------------------------------------------------+
//| Salva tick (timestamp em milissegundos)                          |
//+------------------------------------------------------------------+
void SalvarTick(MqlTick &tick)
{
   double precoMedio = (tick.bid + tick.ask) / 2.0;
   long   tempoMs = (long)tick.time_msc;   // ms desde epoch (hora do servidor)
   if(tempoMs <= 0)
      tempoMs = (long)TimeCurrent() * 1000; // fallback

   precoBuffer[bufferIndex]   = precoMedio;
   tempoBufferMs[bufferIndex] = tempoMs;
   bufferIndex++;
   if(bufferIndex >= BUFFER_SIZE)
   {
      bufferIndex = 0;
      bufferCheio = true;
   }
}
//+------------------------------------------------------------------+
//| "Agora" em ms = timestamp do ultimo tick salvo                   |
//+------------------------------------------------------------------+
long AgoraMs()
{
   int total = bufferCheio ? BUFFER_SIZE : bufferIndex;
   if(total <= 0)
      return (long)TimeCurrent() * 1000;
   int idx = (bufferIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE;
   return tempoBufferMs[idx];
}
//+------------------------------------------------------------------+
//| Movimento (em pontos) dentro da janela em segundos               |
//+------------------------------------------------------------------+
double MovimentoEmSegundos(int segundos)
{
   if(segundos <= 0)
      return 0.0;
   int total = bufferCheio ? BUFFER_SIZE : bufferIndex;
   if(total <= 2)
      return 0.0;
   long agora = AgoraMs();
   long alvo  = agora - (long)segundos * 1000;
   int indiceAtual = (bufferIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE;
   double precoAtual  = precoBuffer[indiceAtual];
   double precoAntigo = 0.0;
   bool encontrou = false;
   for(int i = 0; i < total; i++)
   {
      int idx = (bufferIndex - 1 - i + BUFFER_SIZE) % BUFFER_SIZE;
      if(tempoBufferMs[idx] <= alvo)
      {
         precoAntigo = precoBuffer[idx];
         encontrou   = true;
         break;
      }
   }
   if(!encontrou)
      return 0.0;
   return (precoAtual - precoAntigo) / _Point;
}
//+------------------------------------------------------------------+
//| Quantidade de ticks na janela em segundos                        |
//+------------------------------------------------------------------+
int TicksEmSegundos(int segundos)
{
   if(segundos <= 0)
      return 0;
   int total = bufferCheio ? BUFFER_SIZE : bufferIndex;
   if(total <= 0)
      return 0;
   long agora = AgoraMs();
   long alvo  = agora - (long)segundos * 1000;
   int contador = 0;
   for(int i = 0; i < total; i++)
   {
      int idx = (bufferIndex - 1 - i + BUFFER_SIZE) % BUFFER_SIZE;
      if(tempoBufferMs[idx] >= alvo)
         contador++;
      else
         break;
   }
   return contador;
}
//+------------------------------------------------------------------+
//| Sinal por velocidade                                             |
//+------------------------------------------------------------------+
int SinalPorVelocidade()
{
   double movimento = MovimentoEmSegundos(JanelaVelocidadeSegundos);
   if(movimento >= MovimentoMinimoPontos)
      return 1;
   if(movimento <= -MovimentoMinimoPontos)
      return -1;
   return 0;
}
//+------------------------------------------------------------------+
//| Alerta sonoro                                                    |
//+------------------------------------------------------------------+
void VerificarAlertaSonoro()
{
   if(!AlertaSonoro)
      return;
   double movimento = MovimentoEmSegundos(JanelaVelocidadeSegundos);
   if(MathAbs(movimento) < MovimentoMinimoPontos)
      return;
   if(ultimoAlerta > 0 &&
      TimeCurrent() - ultimoAlerta < IntervaloAlertaSegundos)
      return;
   ultimoAlerta = TimeCurrent();
   bool tocou = PlaySound(ArquivoSom);
   if(!tocou && !avisouSom)
   {
      avisouSom = true;
      Print("AVISO: nao foi possivel tocar '", ArquivoSom,
            "'. Coloque o arquivo em MQL5/Files (ou Sounds) do terminal.");
   }
   Print("ALERTA -> Movimento de ",
         DoubleToString(movimento, 1),
         " pontos em ",
         JanelaVelocidadeSegundos,
         " segundos.");
}
//+------------------------------------------------------------------+
//| Abre compra                                                      |
//+------------------------------------------------------------------+
void AbrirCompra()
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return;
   double volume = NormalizarVolume(LoteFixo);
   double distanciaSL = AjustarDistancia(StopLossPreco);
   double distanciaTP = AjustarDistancia(TakeProfitPreco);
   double precoReferencia = tick.ask;
   double sl = NormalizarPreco(precoReferencia - distanciaSL);
   double tp = NormalizarPreco(precoReferencia + distanciaTP);
   Print("TENTATIVA COMPRA | ASK: ",
         DoubleToString(precoReferencia, _Digits),
         " | SL: ", DoubleToString(sl, _Digits),
         " | TP: ", DoubleToString(tp, _Digits),
         " | Distancia SL: ",
         DoubleToString(precoReferencia - sl, _Digits));
   bool ok = trade.Buy(volume, _Symbol, 0.0, sl, tp, "IA FX BUY");
   if(ok)
   {
      ultimaEntrada = TimeCurrent();
      Print("COMPRA aberta | Preco executado: ",
            DoubleToString(trade.ResultPrice(), _Digits),
            " | SL: ", DoubleToString(sl, _Digits),
            " | TP: ", DoubleToString(tp, _Digits));
   }
   else
   {
      Print("Erro COMPRA: ", trade.ResultRetcode(),
            " - ", trade.ResultRetcodeDescription());
   }
}
//+------------------------------------------------------------------+
//| Abre venda                                                       |
//+------------------------------------------------------------------+
void AbrirVenda()
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return;
   double volume = NormalizarVolume(LoteFixo);
   double distanciaSL = AjustarDistancia(StopLossPreco);
   double distanciaTP = AjustarDistancia(TakeProfitPreco);
   double precoReferencia = tick.bid;
   double sl = NormalizarPreco(precoReferencia + distanciaSL);
   double tp = NormalizarPreco(precoReferencia - distanciaTP);
   Print("TENTATIVA VENDA | BID: ",
         DoubleToString(precoReferencia, _Digits),
         " | SL: ", DoubleToString(sl, _Digits),
         " | TP: ", DoubleToString(tp, _Digits),
         " | Distancia SL: ",
         DoubleToString(sl - precoReferencia, _Digits));
   bool ok = trade.Sell(volume, _Symbol, 0.0, sl, tp, "IA FX SELL");
   if(ok)
   {
      ultimaEntrada = TimeCurrent();
      Print("VENDA aberta | Preco executado: ",
            DoubleToString(trade.ResultPrice(), _Digits),
            " | SL: ", DoubleToString(sl, _Digits),
            " | TP: ", DoubleToString(tp, _Digits));
   }
   else
   {
      Print("Erro VENDA: ", trade.ResultRetcode(),
            " - ", trade.ResultRetcodeDescription());
   }
}
//+------------------------------------------------------------------+
//| Trailing stop                                                    |
//+------------------------------------------------------------------+
void GerenciarTrailing()
{
   if(!UsarTrailingStop)
      return;
   double distanciaTrailing = AjustarDistancia(TrailingDistanciaPreco);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)MagicNumber)
         continue;
      long tipo = PositionGetInteger(POSITION_TYPE);
      double precoEntrada = PositionGetDouble(POSITION_PRICE_OPEN);
      double slAtual = PositionGetDouble(POSITION_SL);
      double tpAtual = PositionGetDouble(POSITION_TP);
      MqlTick tick;
      if(!SymbolInfoTick(_Symbol, tick))
         continue;
      if(tipo == POSITION_TYPE_BUY)
      {
         double lucroPreco = tick.bid - precoEntrada;
         if(lucroPreco < TrailingInicioPreco)
            continue;
         double novoSL = NormalizarPreco(tick.bid - distanciaTrailing);
         double distanciaAtual = tick.bid - novoSL;
         if(distanciaAtual < DistanciaMinimaStops())
            continue;
         if(slAtual == 0.0 || novoSL > slAtual)
         {
            if(!trade.PositionModify(ticket, novoSL, tpAtual))
               Print("Erro trailing COMPRA: ", trade.ResultRetcode(),
                     " - ", trade.ResultRetcodeDescription());
         }
      }
      if(tipo == POSITION_TYPE_SELL)
      {
         double lucroPreco = precoEntrada - tick.ask;
         if(lucroPreco < TrailingInicioPreco)
            continue;
         double novoSL = NormalizarPreco(tick.ask + distanciaTrailing);
         double distanciaAtual = novoSL - tick.ask;
         if(distanciaAtual < DistanciaMinimaStops())
            continue;
         if(slAtual == 0.0 || novoSL < slAtual)
         {
            if(!trade.PositionModify(ticket, novoSL, tpAtual))
               Print("Erro trailing VENDA: ", trade.ResultRetcode(),
                     " - ", trade.ResultRetcodeDescription());
         }
      }
   }
}
//+------------------------------------------------------------------+
//| Verifica meta e stop diario (por resultado realizado)            |
//+------------------------------------------------------------------+
void VerificarTravasDiarias()
{
   if(baseInicialDia <= 0.0)
      return;
   double referenciaAtual = UsarEquityNasTravas
      ? AccountInfoDouble(ACCOUNT_EQUITY)
      : AccountInfoDouble(ACCOUNT_BALANCE);
   double resultadoDiaValor = referenciaAtual - baseInicialDia;
   if(UsarMetaDiaria && resultadoDiaValor >= MetaDiariaValor)
   {
      Print("Meta diaria atingida: $",
            DoubleToString(resultadoDiaValor, 2));
      bloqueioDiario = true;              // impede novas entradas hoje
      if(PausarAposMetaOuStop)
         roboPausado = true;
      return;
   }
   if(UsarStopDiario && resultadoDiaValor <= -StopDiarioValor)
   {
      Print("Stop diario atingido: $",
            DoubleToString(resultadoDiaValor, 2));
      if(FecharOrdensNoStopDiario)
         FecharTodasOrdens();
      bloqueioDiario = true;              // impede reabertura no mesmo dia
      if(PausarAposMetaOuStop)
         roboPausado = true;
   }
}
//+------------------------------------------------------------------+
//| Fecha posicoes do robo                                           |
//+------------------------------------------------------------------+
void FecharTodasOrdens()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)MagicNumber)
         continue;
      if(!trade.PositionClose(ticket))
         Print("Erro ao fechar posicao ", ticket, ": ",
               trade.ResultRetcodeDescription());
   }
}
//+------------------------------------------------------------------+
//| Conta posicoes abertas do robo                                   |
//+------------------------------------------------------------------+
int ContarOrdensAbertas()
{
   int total = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)MagicNumber)
         continue;
      total++;
   }
   return total;
}
//+------------------------------------------------------------------+
//| Spread atual em pontos                                           |
//+------------------------------------------------------------------+
double SpreadAtualPontos()
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return 999999.0;
   return (tick.ask - tick.bid) / _Point;
}
//+------------------------------------------------------------------+
//| Hora do Brasil (relogio de parede como timestamp)                |
//+------------------------------------------------------------------+
datetime HoraBrasil()
{
   return TimeGMT() + OffsetBrasilUTC * 3600;
}
//+------------------------------------------------------------------+
//| Horario permitido                                                |
//+------------------------------------------------------------------+
bool HorarioPermitido()
{
   if(!UsarHorarioBrasil)
      return true;
   MqlDateTime dt;
   TimeToStruct(HoraBrasil(), dt);
   int minutoAtual  = dt.hour * 60 + dt.min;
   int minutoInicio = HoraInicioBrasil * 60 + MinutoInicioBrasil;
   int minutoFim    = HoraFimBrasil * 60 + MinutoFimBrasil;
   if(minutoInicio == minutoFim)
      return true;
   if(minutoInicio < minutoFim)
      return (minutoAtual >= minutoInicio && minutoAtual < minutoFim);
   return (minutoAtual >= minutoInicio || minutoAtual < minutoFim);
}
//+------------------------------------------------------------------+
//| Atualiza o dia                                                   |
//+------------------------------------------------------------------+
void AtualizarDia()
{
   MqlDateTime dt;
   TimeToStruct(HoraBrasil(), dt);
   int dia = dt.year * 10000 + dt.mon * 100 + dt.day;
   if(dia != diaAtualBrasil)
      ResetarDia();
}
//+------------------------------------------------------------------+
//| Reinicia controles diarios                                       |
//+------------------------------------------------------------------+
void ResetarDia()
{
   MqlDateTime dt;
   TimeToStruct(HoraBrasil(), dt);
   diaAtualBrasil = dt.year * 10000 + dt.mon * 100 + dt.day;
   // Base realizada por padrao (balance); floating so se o usuario pedir.
   baseInicialDia = UsarEquityNasTravas
      ? AccountInfoDouble(ACCOUNT_EQUITY)
      : AccountInfoDouble(ACCOUNT_BALANCE);
   roboPausado    = false;
   bloqueioDiario = false;
   Print("Novo dia iniciado. Base inicial: $",
         DoubleToString(baseInicialDia, 2),
         UsarEquityNasTravas ? " (equity)" : " (balance)");
}
//+------------------------------------------------------------------+
//| Meia-noite de hoje (Brasil) convertida para GMT                  |
//+------------------------------------------------------------------+
datetime MeiaNoiteHojeGMT()
{
   MqlDateTime dt;
   TimeToStruct(HoraBrasil(), dt);
   dt.hour = 0;
   dt.min  = 0;
   dt.sec  = 0;
   // StructToTime devolve o instante como se os campos fossem GMT;
   // subtraindo o offset do Brasil obtemos o instante GMT real.
   return StructToTime(dt) - OffsetBrasilUTC * 3600;
}
//+------------------------------------------------------------------+
//| Inicio do dia (hora do servidor, para HistorySelect)             |
//+------------------------------------------------------------------+
datetime InicioDiaBrasil()
{
   return (datetime)(MeiaNoiteHojeGMT() + ServidorMenosGMT());
}
//+------------------------------------------------------------------+
//| Inicio da semana (hora do servidor)                              |
//+------------------------------------------------------------------+
datetime InicioSemanaBrasil()
{
   MqlDateTime dt;
   TimeToStruct(HoraBrasil(), dt);
   int voltarDias = (dt.day_of_week == 0) ? 6 : (dt.day_of_week - 1);
   // Subtrai por segundos: nao ha risco de dia negativo.
   datetime semanaGMT = MeiaNoiteHojeGMT() - (datetime)voltarDias * 86400;
   return (datetime)(semanaGMT + ServidorMenosGMT());
}
//+------------------------------------------------------------------+
//| Inicio do mes (hora do servidor)                                 |
//+------------------------------------------------------------------+
datetime InicioMesBrasil()
{
   MqlDateTime dt;
   TimeToStruct(HoraBrasil(), dt);
   dt.day  = 1;
   dt.hour = 0;
   dt.min  = 0;
   dt.sec  = 0;
   datetime mesGMT = StructToTime(dt) - OffsetBrasilUTC * 3600;
   return (datetime)(mesGMT + ServidorMenosGMT());
}
//+------------------------------------------------------------------+
//| Lucro do periodo (deals do robo)                                 |
//+------------------------------------------------------------------+
double LucroPeriodo(datetime inicio, datetime fim)
{
   double lucro = 0.0;
   if(!HistorySelect(inicio, fim))
      return 0.0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0)
         continue;
      string simbolo = HistoryDealGetString(deal, DEAL_SYMBOL);
      long magic     = HistoryDealGetInteger(deal, DEAL_MAGIC);
      long tipoDeal  = HistoryDealGetInteger(deal, DEAL_TYPE);
      if(simbolo != _Symbol)
         continue;
      if(magic != (long)MagicNumber)
         continue;
      // Ignora deals de saldo/credito (deposito, saque etc.)
      if(tipoDeal != DEAL_TYPE_BUY && tipoDeal != DEAL_TYPE_SELL)
         continue;
      // Soma TODOS os deals (entrada e saida) da posicao:
      // lucro fica na saida; comissao normalmente entra na abertura.
      // Assim o resultado sai realmente liquido.
      lucro += HistoryDealGetDouble(deal, DEAL_PROFIT);
      lucro += HistoryDealGetDouble(deal, DEAL_SWAP);
      lucro += HistoryDealGetDouble(deal, DEAL_COMMISSION);
      lucro += HistoryDealGetDouble(deal, DEAL_FEE);
   }
   return lucro;
}
//+------------------------------------------------------------------+
//| Painel                                                           |
//+------------------------------------------------------------------+
void CriarPainel()
{
   if(!MostrarPainel)
      return;
   CriarRetangulo("PAINEL_BG", PainelX, PainelY, 255, 165);
   CriarTexto("PAINEL_TITULO", PainelX + 10, PainelY + 10,  "IA FX : CARREGANDO", 10);
   CriarTexto("PAINEL_SPREAD", PainelX + 10, PainelY + 35,  "SPREAD : 0.0 pts", 10);
   CriarTexto("PAINEL_FREQ",   PainelX + 10, PainelY + 60,  "FREQUENCIA : 0 ticks", 10);
   CriarTexto("PAINEL_DIA",    PainelX + 10, PainelY + 85,  "LUCRO DO DIA : $0.00", 10);
   CriarTexto("PAINEL_SEMANA", PainelX + 10, PainelY + 108, "LUCRO DA SEMANA : $0.00", 10);
   CriarTexto("PAINEL_MES",    PainelX + 10, PainelY + 131, "LUCRO DO MES : $0.00", 10);
   ChartRedraw();
}
//+------------------------------------------------------------------+
//| Cria fundo do painel                                             |
//+------------------------------------------------------------------+
void CriarRetangulo(string nome, int x, int y, int largura, int altura)
{
   ObjectDelete(0, nome);
   ObjectCreate(0, nome, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, nome, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, nome, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, nome, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, nome, OBJPROP_XSIZE, largura);
   ObjectSetInteger(0, nome, OBJPROP_YSIZE, altura);
   ObjectSetInteger(0, nome, OBJPROP_COLOR, clrSilver);
   ObjectSetInteger(0, nome, OBJPROP_BGCOLOR, clrBlack);
   ObjectSetInteger(0, nome, OBJPROP_BORDER_COLOR, clrSilver);
   ObjectSetInteger(0, nome, OBJPROP_BACK, false);
   ObjectSetInteger(0, nome, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, nome, OBJPROP_HIDDEN, true);
}
//+------------------------------------------------------------------+
//| Cria texto                                                       |
//+------------------------------------------------------------------+
void CriarTexto(string nome, int x, int y, string texto, int tamanho)
{
   ObjectDelete(0, nome);
   ObjectCreate(0, nome, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, nome, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, nome, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, nome, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, nome, OBJPROP_COLOR, clrWhite);
   ObjectSetInteger(0, nome, OBJPROP_FONTSIZE, tamanho);
   ObjectSetInteger(0, nome, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, nome, OBJPROP_HIDDEN, true);
   ObjectSetString(0, nome, OBJPROP_FONT, "Arial");
   ObjectSetString(0, nome, OBJPROP_TEXT, texto);
}
//+------------------------------------------------------------------+
//| Atualiza painel                                                  |
//+------------------------------------------------------------------+
void AtualizarPainel()
{
   if(!MostrarPainel)
      return;
   string status;
   if(roboPausado)
      status = "PAUSADO";
   else if(bloqueioDiario)
      status = "TRAVA DIARIA";
   else if(HorarioPermitido())
      status = "OPERANDO";
   else
      status = "FORA DO HORARIO";
   double spread     = SpreadAtualPontos();
   int    frequencia = TicksEmSegundos(JanelaVelocidadeSegundos);
   double lucroDia    = LucroPeriodo(InicioDiaBrasil(),    TimeCurrent());
   double lucroSemana = LucroPeriodo(InicioSemanaBrasil(), TimeCurrent());
   double lucroMes    = LucroPeriodo(InicioMesBrasil(),    TimeCurrent());
   ObjectSetString(0, "PAINEL_TITULO", OBJPROP_TEXT, "IA FX : " + status);
   ObjectSetString(0, "PAINEL_SPREAD", OBJPROP_TEXT,
                   "SPREAD : " + DoubleToString(spread, 1) + " pts");
   ObjectSetString(0, "PAINEL_FREQ", OBJPROP_TEXT,
                   "FREQUENCIA : " + IntegerToString(frequencia) +
                   " ticks/" + IntegerToString(JanelaVelocidadeSegundos) + "s");
   ObjectSetString(0, "PAINEL_DIA", OBJPROP_TEXT,
                   "LUCRO DO DIA : $" + DoubleToString(lucroDia, 2));
   ObjectSetString(0, "PAINEL_SEMANA", OBJPROP_TEXT,
                   "LUCRO DA SEMANA : $" + DoubleToString(lucroSemana, 2));
   ObjectSetString(0, "PAINEL_MES", OBJPROP_TEXT,
                   "LUCRO DO MES : $" + DoubleToString(lucroMes, 2));
   ChartRedraw();
}
//+------------------------------------------------------------------+
