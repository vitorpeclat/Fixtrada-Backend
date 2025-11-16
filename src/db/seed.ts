// ============================================================================
// SEED: Preenchimento de Dados para Testes
// ============================================================================
// Script para popular o banco de dados com dados fictícios de teste

import { db } from './connection.ts';
import { fakerPT_BR as faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { customAlphabet } from 'nanoid';
import { chat } from './schema/chat.ts';
import { carro } from './schema/carro.ts';
import { endereco } from './schema/endereco.ts';
import { mensagem } from './schema/mensagem.ts';
import { prestadorServico } from './schema/prestadorServico.ts';
import { registroServico } from './schema/registroServico.ts';
import { tipoServico } from './schema/tipoServico.ts';
import { usuario } from './schema/usuario.ts';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

async function seed() {
    console.log('Iniciando o processo de seed...');
    
    // Limpar tabelas existentes para evitar duplicações
    await db.delete(mensagem);
    await db.delete(chat);
    await db.delete(registroServico);
    await db.delete(carro);
    await db.delete(prestadorServico);
    await db.delete(tipoServico);
    await db.delete(endereco);
    await db.delete(usuario);
    
    // Arrays para armazenar IDs e garantir relacionamentos
    const insertedUsuarios = [];
    const insertedCarros = [];
    const insertedEnderecos = [];
    const insertedPrestadores = [];
    const insertedTiposServico = [];

    // Geração de dados de Endereço
    for (let i = 0; i < 5; i++) {
        const [insertedEndereco] = await db.insert(endereco).values({
            endCEP: faker.location.zipCode('########'),
            endRua: faker.location.street(),
            endBairro: faker.location.secondaryAddress(),
            endCidade: faker.location.city(),
            endEstado: 'SP',
        }).returning();
        insertedEnderecos.push(insertedEndereco);
    }
    console.log('5 endereços inseridos com sucesso.');

    // Geração de dados de Usuário
    const plainPassword = '12345aA@';
    const hashedPassword = await bcrypt.hash(plainPassword, 8);

    // Criar um administrador
    const [adminUser] = await db.insert(usuario).values({
        usuID: uuidv4(),
        usuLogin: 'admin@fixtrada.com',
        usuSenha: hashedPassword,
        usuNome: 'Administrador Fixtrada',
        usuDataNasc: faker.date.birthdate().toISOString(),
        usuCpf: faker.string.numeric(11),
        usuTelefone: faker.string.numeric('119########'),
        usuAtivo: true,
        usuStatus: 'ativo',
        usuTipo: 'admin',
    }).returning();
    insertedUsuarios.push(adminUser);
    console.log('1 administrador inserido com sucesso.');

    for (let i = 0; i < 5; i++) {
        const fullName = faker.person.fullName();
        const firstName = fullName.split(' ')[0] || `user${i + 1}`;
        const email = `${firstName.toLowerCase()}${i + 1}@email.com`;

        const [insertedUsuario] = await db.insert(usuario).values({
            usuID: uuidv4(),
            usuLogin: email,
            usuSenha: hashedPassword,
            usuNome: fullName,
            usuDataNasc: faker.date.birthdate().toISOString(),
            usuCpf: faker.string.numeric(11),
            usuTelefone: faker.string.numeric('119########'),
            usuAtivo: true,
            usuStatus: 'ativo',
            usuTipo: 'cliente',
        }).returning();
        insertedUsuarios.push(insertedUsuario);
    }
    console.log('5 usuários inseridos com sucesso.');

    // Geração de dados de Carro (depende de Usuário)
    for (let i = 0; i < 10; i++) {
        const usuarioAleatorio = insertedUsuarios[Math.floor(Math.random() * insertedUsuarios.length)];
        const [insertedCarro] = await db.insert(carro).values({
            carID: uuidv4(),
            carPlaca: faker.string.alphanumeric(7),
            carMarca: faker.vehicle.manufacturer(),
            carModelo: faker.vehicle.model(),
            carAno: faker.date.past({ years: 10 }).getFullYear(),
            carCor: faker.vehicle.color(),
            carKM: faker.number.int({ min: 1000, max: 200000 }),
            carTpCombust: faker.vehicle.fuel(),
            carOpTracao: faker.helpers.arrayElement(['Dianteira', 'Traseira', 'Integral']),
            carOpTrocaOleo: faker.date.future({ years: 1 }).toISOString(),
            carOpTrocaPneu: faker.date.future({ years: 2 }).toISOString(),
            carOpRevisao: faker.lorem.words(5),
            carAtivo: true,
            fk_usuario_usuID: usuarioAleatorio.usuID,
        }).returning();
        insertedCarros.push(insertedCarro);
    }
    console.log('10 carros inseridos com sucesso.');

    // Geração de dados de Prestador de Serviço (depende de Endereço e Usuário)
    for (let i = 0; i < 3; i++) {
        const enderecoAleatorio = insertedEnderecos[Math.floor(Math.random() * insertedEnderecos.length)];
        const fullName = faker.person.fullName();
        const email = `prestador${i + 1}@email.com`;

        const [insertedUsuario] = await db.insert(usuario).values({
            usuID: uuidv4(),
            usuLogin: email,
            usuSenha: hashedPassword,
            usuNome: fullName,
            usuDataNasc: faker.date.birthdate().toISOString(),
            usuCpf: faker.string.numeric(11),
            usuTelefone: faker.string.numeric('119########'),
            usuAtivo: true,
            usuStatus: 'ativo',
            usuTipo: 'prestador',
        }).returning();
        insertedUsuarios.push(insertedUsuario);

        const [insertedPrestador] = await db.insert(prestadorServico).values({
            mecCNPJ: faker.string.numeric(14),
            mecNota: faker.number.float({ min: 1, max: 5}),
            mecEnderecoNum: faker.number.int({ min: 100, max: 5000 }),
            mecNome: fullName,
            mecDataNasc: faker.date.birthdate().toISOString(),
            mecLogin: email,
            mecSenha: hashedPassword,
            mecAtivo: true,
            fk_endereco_endCEP: enderecoAleatorio.endCEP,
            fk_usuario_usuID: insertedUsuario.usuID,
        } as any).returning();
        insertedPrestadores.push(insertedPrestador);
    }
    console.log('3 prestadores de serviço inseridos com sucesso.');

    // Geração de dados de Tipo de Serviço
    const tiposDeProblema = ['Troca de Óleo', 'Revisão Geral', 'Alinhamento e Balanceamento', 'Conserto de Freios'];
    for (const tipo of tiposDeProblema) {
        const [insertedTipoServico] = await db.insert(tipoServico).values({
            tseID: uuidv4(),
            tseTipoProblema: tipo,
        }).returning();
        insertedTiposServico.push(insertedTipoServico);
    }
    console.log(`${tiposDeProblema.length} tipos de serviço inseridos com sucesso.`);

    // Geração de dados de Registro de Serviço (depende de Carro, Prestador e Tipo de Serviço)
    for (let i = 0; i < 15; i++) {
        const carroAleatorio = insertedCarros[Math.floor(Math.random() * insertedCarros.length)];
        const prestadorAleatorio = insertedPrestadores[Math.floor(Math.random() * insertedPrestadores.length)];
        const tipoServicoAleatorio = insertedTiposServico[Math.floor(Math.random() * insertedTiposServico.length)];
        const dataServico = faker.date.past({ years: 1 });
        
        const [insertedRegistro] = await db.insert(registroServico).values({
            regID: uuidv4(),
            regCodigo: nanoid(),
            regDescricao: faker.lorem.sentence(),
            regData: dataServico.toISOString().split('T')[0],
            regHora: dataServico,
            fk_endereco_endCEP: prestadorAleatorio.fk_endereco_endCEP,
            fk_carro_carID: carroAleatorio.carID,
            fk_prestador_servico_mecCNPJ: prestadorAleatorio.mecCNPJ,
            fk_tipo_servico_tseID: tipoServicoAleatorio.tseID,
        }).returning();

        const [insertedChat] = await db.insert(chat).values({
            chatID: uuidv4(),
            fk_usuario_usuID: carroAleatorio.fk_usuario_usuID,
            fk_prestador_servico_mecCNPJ: prestadorAleatorio.mecCNPJ,
            fk_registro_servico_regID: insertedRegistro.regID,
        }).returning();

        await db.insert(mensagem).values([
            {
                menID: uuidv4(),
                menConteudo: `Olá, sobre o serviço ${insertedRegistro.regCodigo}.`,
                fk_remetente_usuID: carroAleatorio.fk_usuario_usuID,
                fk_chat_chatID: insertedChat.chatID,
            },
            {
                menID: uuidv4(),
                menConteudo: `Recebido. O que gostaria de saber?`,
                fk_remetente_usuID: prestadorAleatorio.fk_usuario_usuID,
                fk_chat_chatID: insertedChat.chatID,
            }
        ]);
    }
    console.log('15 registros de serviço e mensagens associadas inseridos com sucesso.');

    // Geração de Chats INDEPENDENTES (sem registro de serviço)
    console.log('Iniciando geração de chats independentes (sem serviço)...');
    
    for (let i = 0; i < 5; i++) {
        const usuarioAleatorio = insertedUsuarios.filter(u => u.usuTipo === 'cliente')[Math.floor(Math.random() * 5)];
        const prestadorAleatorio = insertedPrestadores[Math.floor(Math.random() * insertedPrestadores.length)];

        if (!usuarioAleatorio || !prestadorAleatorio) {
            console.warn("Usuário ou prestador aleatório não encontrado, pulando chat independente.");
            continue;
        }

        try {
            const [insertedChat] = await db.insert(chat).values({
                chatID: uuidv4(),
                fk_usuario_usuID: usuarioAleatorio.usuID,
                fk_prestador_servico_mecCNPJ: prestadorAleatorio.mecCNPJ,
            }).returning();

            await db.insert(mensagem).values([
                {
                    menID: uuidv4(),
                    menConteudo: `Olá, ${prestadorAleatorio.mecNome}, gostaria de um orçamento.`,
                    fk_remetente_usuID: usuarioAleatorio.usuID,
                    fk_chat_chatID: insertedChat.chatID,
                },
                {
                    menID: uuidv4(),
                    menConteudo: `Claro, ${usuarioAleatorio.usuNome}. Do que precisa?`,
                    fk_remetente_usuID: prestadorAleatorio.fk_usuario_usuID,
                    fk_chat_chatID: insertedChat.chatID,
                }
            ]);
        } catch (error) {
            console.error("Erro ao inserir chat independente:", error);
        }
    }
    console.log('5 chats independentes inseridos com sucesso.');
    
    console.log('Processo de seed finalizado com sucesso!');
}

seed().catch((err) => {
    console.error('Erro durante o seed:', err);
    process.exit(1);
});