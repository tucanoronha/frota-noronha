/* ========================================
   Frota Noronha — Camada de banco de dados
   ========================================
   Funções para ler e escrever no Supabase.
   Cada função retorna { data, error }.
   ======================================== */

// Cliente Supabase (criado quando o script carrega)
const _supabase = window.supabase.createClient(
  window.CONFIG.SUPABASE_URL,
  window.CONFIG.SUPABASE_KEY
);
window.sb = _supabase;  // disponível pra debug no console

// ----------------------------------------
// Helper: tenta conectar pra confirmar saúde
// ----------------------------------------
async function dbPing() {
  try {
    const { error } = await _supabase.from('motoristas').select('id').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
}

// ========================================
// MOTORISTAS
// ========================================

async function dbListMotoristas() {
  const { data, error } = await _supabase
    .from('motoristas')
    .select('id, nome, pin, ativo')
    .eq('ativo', true)
    .order('nome');
  if (error) console.warn('[DB] listMotoristas:', error);
  return data || [];
}

async function dbCheckPin(motoristaId, pin) {
  const { data, error } = await _supabase
    .from('motoristas')
    .select('id, nome, pin')
    .eq('id', motoristaId)
    .single();
  if (error || !data) return false;
  return data.pin === pin;
}

async function dbCreateMotorista({ nome, pin }) {
  const { data, error } = await _supabase
    .from('motoristas')
    .insert({ nome, pin, ativo: true })
    .select()
    .single();
  if (error) console.warn('[DB] createMotorista:', error);
  return { data, error };
}

// ========================================
// CARROS
// ========================================

async function dbListCarros() {
  const { data, error } = await _supabase
    .from('carros')
    .select('id, placa, modelo, status')
    .order('placa');
  if (error) console.warn('[DB] listCarros:', error);
  return data || [];
}

async function dbGetCarro(id) {
  const { data, error } = await _supabase
    .from('carros')
    .select('*')
    .eq('id', id)
    .single();
  if (error) console.warn('[DB] getCarro:', error);
  return data;
}

async function dbUpdateCarroStatus(id, status) {
  const { error } = await _supabase
    .from('carros')
    .update({ status })
    .eq('id', id);
  if (error) console.warn('[DB] updateCarroStatus:', error);
  return !error;
}

// ========================================
// PEÇAS CADASTRADAS
// ========================================

async function dbListPecas() {
  const { data, error } = await _supabase
    .from('pecas_cadastradas')
    .select('id, nome, icone, km_troca, meses_troca')
    .eq('ativo', true)
    .order('nome');
  if (error) console.warn('[DB] listPecas:', error);
  return data || [];
}

// ========================================
// SERVIÇOS REGISTRADOS
// ========================================

async function dbListServicosByCarro(carroId, limit = 100) {
  const { data, error } = await _supabase
    .from('servicos_registrados')
    .select('id, peca_nome, valor_centavos, data, observacao, motorista_nome, criado_em')
    .eq('carro_id', carroId)
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(limit);
  if (error) console.warn('[DB] listServicosByCarro:', error);
  return data || [];
}

async function dbCreateServico({ carro_id, motorista_id, motorista_nome, peca_nome, valor_centavos, observacao }) {
  const payload = {
    carro_id,
    motorista_nome,
    peca_nome,
    valor_centavos: valor_centavos || 0,
    observacao: observacao || null
  };
  if (motorista_id) payload.motorista_id = motorista_id;

  const { data, error } = await _supabase
    .from('servicos_registrados')
    .insert(payload)
    .select()
    .single();
  if (error) console.warn('[DB] createServico:', error);
  return { data, error };
}

// ========================================
// MANUTENÇÕES
// ========================================

async function dbActiveMaintenance(carroId) {
  const { data, error } = await _supabase
    .from('manutencoes')
    .select('id, motivo, transcricao_audio, data_inicio, motorista_nome')
    .eq('carro_id', carroId)
    .eq('ativa', true)
    .order('data_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.warn('[DB] activeMaintenance:', error);
  return data;
}

async function dbAllActiveMaintenances() {
  const { data, error } = await _supabase
    .from('manutencoes')
    .select('id, motivo, data_inicio, motorista_nome, carros(id, placa, modelo)')
    .eq('ativa', true)
    .order('data_inicio', { ascending: false });
  if (error) console.warn('[DB] allActiveMaintenances:', error);
  return data || [];
}

async function dbStartMaintenance({ carro_id, motorista_id, motorista_nome, motivo, transcricao_audio }) {
  const payload = {
    carro_id,
    motorista_nome,
    motivo,
    transcricao_audio: transcricao_audio || null,
    ativa: true
  };
  if (motorista_id) payload.motorista_id = motorista_id;

  const { data, error } = await _supabase
    .from('manutencoes')
    .insert(payload)
    .select()
    .single();
  if (!error) {
    await dbUpdateCarroStatus(carro_id, 'manutencao');
  } else {
    console.warn('[DB] startMaintenance:', error);
  }
  return { data, error };
}

async function dbEndMaintenance(manutencaoId, carroId) {
  const { error } = await _supabase
    .from('manutencoes')
    .update({ ativa: false, data_fim: new Date().toISOString() })
    .eq('id', manutencaoId);
  if (!error && carroId) {
    await dbUpdateCarroStatus(carroId, 'ok');
  }
  if (error) console.warn('[DB] endMaintenance:', error);
  return !error;
}

// ========================================
// OBSERVAÇÕES
// ========================================

async function dbCreateObservacao({ carro_id, motorista_id, motorista_nome, texto, transcricao_audio }) {
  const payload = {
    carro_id,
    motorista_nome,
    texto,
    transcricao_audio: transcricao_audio || null
  };
  if (motorista_id) payload.motorista_id = motorista_id;

  const { data, error } = await _supabase
    .from('observacoes')
    .insert(payload)
    .select()
    .single();
  if (error) console.warn('[DB] createObservacao:', error);
  return { data, error };
}

async function dbListObservacoesByCarro(carroId, limit = 50) {
  const { data, error } = await _supabase
    .from('observacoes')
    .select('id, texto, transcricao_audio, data, motorista_nome')
    .eq('carro_id', carroId)
    .order('data', { ascending: false })
    .limit(limit);
  if (error) console.warn('[DB] listObservacoesByCarro:', error);
  return data || [];
}

// ========================================
// E-MAILS DE ALERTA
// ========================================

async function dbListEmails() {
  const { data, error } = await _supabase
    .from('emails_alerta')
    .select('id, email, nome, ativo')
    .eq('ativo', true)
    .order('email');
  if (error) console.warn('[DB] listEmails:', error);
  return data || [];
}

// ========================================
// ALERTAS (calculados a partir dos serviços)
// ========================================

/**
 * Para cada peça com prazo, descobre quando foi a última troca
 * pra esse carro e devolve uma lista de alertas (vencido / vencendo).
 */
async function dbCalculateAlertas(carroId) {
  const [pecas, servicos] = await Promise.all([
    dbListPecas(),
    dbListServicosByCarro(carroId, 1000)
  ]);

  const alertas = [];
  const hoje = new Date();
  const HOJE_TS = hoje.getTime();

  for (const peca of pecas) {
    // Lavagem etc. (sem prazo) não geram alerta
    if (!peca.meses_troca && !peca.km_troca) continue;

    // Última troca dessa peça para esse carro
    const ultima = servicos.find(s =>
      s.peca_nome.toLowerCase() === peca.nome.toLowerCase()
    );

    if (!ultima) {
      // Nunca foi trocada — peça pendente
      alertas.push({
        peca_nome: peca.nome,
        icone: peca.icone,
        urgente: true,
        titulo: peca.nome + ' nunca trocado',
        descricao: 'Não há registro dessa troca pra esse carro.',
        when: 'sem registro'
      });
      continue;
    }

    if (peca.meses_troca) {
      const dataUltima = new Date(ultima.data);
      const proximaTroca = new Date(dataUltima);
      proximaTroca.setMonth(proximaTroca.getMonth() + peca.meses_troca);

      const diasFaltam = Math.round((proximaTroca.getTime() - HOJE_TS) / (1000*60*60*24));

      if (diasFaltam < 0) {
        alertas.push({
          peca_nome: peca.nome,
          icone: peca.icone,
          urgente: true,
          titulo: peca.icone + ' ' + peca.nome + ' atrasado',
          descricao: 'Última troca foi em ' + formatDate(dataUltima) + '. Já passou ' + Math.abs(diasFaltam) + ' dias do prazo.',
          when: 'há ' + Math.abs(diasFaltam) + ' dias'
        });
      } else if (diasFaltam <= 30) {
        alertas.push({
          peca_nome: peca.nome,
          icone: peca.icone,
          urgente: false,
          titulo: peca.icone + ' ' + peca.nome,
          descricao: 'Última troca: ' + formatDate(dataUltima) + '. Vencimento estimado: ' + formatDate(proximaTroca) + '.',
          when: 'em ' + diasFaltam + ' dias'
        });
      }
    }
  }
  return alertas;
}

function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return String(dt.getDate()).padStart(2,'0') + '/' + String(dt.getMonth()+1).padStart(2,'0') + '/' + dt.getFullYear();
}

// ========================================
// EDGE FUNCTION: e-mail de manutenção
// ========================================
async function dbSendMaintenanceEmail({ carro_placa, carro_modelo, motorista_nome, motivo, transcricao_audio }) {
  try {
    const resp = await fetch(window.CONFIG.SUPABASE_URL + '/functions/v1/send-maintenance-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carro_placa, carro_modelo, motorista_nome, motivo, transcricao_audio })
    });
    if (!resp.ok) {
      console.warn('[DB] sendMaintenanceEmail status:', resp.status);
      return { ok: false };
    }
    const data = await resp.json();
    return { ok: true, sent: data.sent };
  } catch (e) {
    console.warn('[DB] sendMaintenanceEmail erro:', e);
    return { ok: false };
  }
}
