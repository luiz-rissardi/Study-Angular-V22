const URL_INITIATE = 'http://localhost:4200/payment/initiate';
const URL_CONFIRM = 'http://localhost:4200/payment/confirm';

const payload = {
    amount: 100,
    destination: 2233,
    userId: "user_sistel_utfpr"
};

// Chave fixa gerada pelo "front-end" para a intenção do clique
const idempotencyKeyDoFront = 'chave-ficticia-do-clique-' + Date.now();

async function rodarFluxoCompleto() {
    console.log('--- PASSO 1: Iniciando o Pagamento (/initiate) ---');
    
    let idempotencyToken = '';
    
    try {
        const resInit = await fetch(URL_INITIATE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'idempotency-key': idempotencyKeyDoFront
            },
            body: JSON.stringify(payload)
        });
        
        const dataInit = await resInit.json();
        idempotencyToken = dataInit.idempotencyToken;
        
        console.log(`[Servidor] JWT de Idempotência gerado: ${idempotencyToken.substring(0, 30)}...\n`);
    } catch (err) {
        console.error('Falha ao iniciar pagamento:', err.message);
        return;
    }

    console.log('--- PASSO 2: Disparando 10 Confirmações Simultâneas (/confirm) ---');

    // Cria as 10 tentativas de confirmação usando o JWT gerado como a chave de cabeçalho
    const promessas = Array.from({ length: 10 }).map((_, index) => {
        const idRequisicao = index + 1;
        
        return fetch(URL_CONFIRM, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Enviando o token gerado pelo servidor como o identificador da trava
                'idempotency-key': idempotencyToken
            },
            body: JSON.stringify(payload)
        })
        .then(async (res) => {
            let body;
            try { body = await res.json(); } catch { body = await res.text(); }
            return { id: idRequisicao, status: res.status, data: body };
        })
        .catch((err) => {
            return { id: idRequisicao, erro: err.message };
        });
    });

    // Dispara todas ao mesmo tempo
    const resultados = await Promise.all(promessas);

    // Exibe os resultados na tela
    resultados.forEach((res) => {
        if (res.erro) {
            console.log(`[Req #${res.id}] Falha na conexão: ${res.erro}`);
        } else {
            console.log(`[Req #${res.id}] Status HTTP: ${res.status} | Resposta:`, res.data);
        }
    });

    console.log('\n--- Fim do teste de fluxo ---');
}

rodarFluxoCompleto();