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
            endEstado: faker.location.state({ abbreviated: true }),
        }).returning();
        insertedEnderecos.push(insertedEndereco);
    }
    console.log('5 endereços inseridos com sucesso.');

    // Geração de dados de Usuário
    // Hashear a senha padrão uma vez
    const plainPassword = '12345aA@';
    const hashedPassword = await bcrypt.hash(plainPassword, 8);

    // Criar usuário administrador
    const [adminUser] = await db.insert(usuario).values({
        usuID: uuidv4(),
        usuLogin: 'admin',
        usuSenha: hashedPassword, // senha: 12345aA@
        usuNome: 'Administrador',
        usuDataNasc: '1990-01-01',
        usuCpf: '00000000000',
        usuTelefone: '11900000000',
        usuAtivo: true,
        usuVerificado: true,
        usuRole: 'admin',
    }).returning();
    insertedUsuarios.push(adminUser);
    console.log('Usuário administrador criado com sucesso (login: admin, senha: 12345aA@)');

    // Criar endereço para prestador de teste
    const [enderecoPrestadorTeste] = await db.insert(endereco).values({
        endCEP: '01310100',
        endRua: 'Avenida Paulista',
        endBairro: 'Bela Vista',
        endCidade: 'São Paulo',
        endEstado: 'SP',
    }).onConflictDoNothing().returning();
    insertedEnderecos.push(enderecoPrestadorTeste);

    // Criar prestador de teste
    const [prestadorTeste] = await db.insert(prestadorServico).values({
        mecCNPJ: '12345678000100',
        mecNota: 5.0,
        mecNome: 'Oficina Teste',
        mecEnderecoNum: 1000,
        mecLogin: 'prestador@teste.com',
        mecSenha: hashedPassword, // senha: 12345aA@
        mecAtivo: true,
        mecVerificado: true,
        fk_endereco_endCEP: enderecoPrestadorTeste.endCEP,
    }).returning();
    insertedPrestadores.push(prestadorTeste);
    console.log('Prestador de teste criado com sucesso (login: prestador@teste.com, senha: 12345aA@)');

    for (let i = 0; i < 5; i++) {
        const fullName = faker.person.fullName();
        const firstName = fullName.split(' ')[0] || `user${i + 1}`;
        // garantir unicidade do email/login adicionando índice
        const email = `${firstName.toLowerCase()}${i + 1}@email.com`;

        const [insertedUsuario] = await db.insert(usuario).values({
            usuID: uuidv4(),
            usuLogin: email,
            usuSenha: hashedPassword,
            usuNome: fullName,
            usuDataNasc: faker.date.birthdate().toISOString().split('T')[0],
            usuCpf: faker.string.numeric(11),
            usuTelefone: faker.string.numeric('119########'),
            usuAtivo: faker.datatype.boolean(),
            usuVerificado: true, // Usuários seed já verificados
            usuRole: 'cliente',
        }).returning();
        insertedUsuarios.push(insertedUsuario);
    }
    console.log('5 usuários clientes inseridos com sucesso.');

    // Geração de dados de Carro (depende de Usuário)
    for (let i = 0; i < 10; i++) {
        const usuarioAleatorio = insertedUsuarios[Math.floor(Math.random() * insertedUsuarios.length)];
        const [insertedCarro] = await db.insert(carro).values({
            carID: uuidv4(),
            carPlaca: faker.string.alphanumeric(7).toUpperCase(),
            carMarca: faker.vehicle.manufacturer(),
            carModelo: faker.vehicle.model(),
            carAno: faker.date.past({ years: 10 }).getFullYear(),
            carCor: faker.vehicle.color(),
            carKM: faker.number.int({ min: 1000, max: 200000 }),
            carTpCombust: faker.vehicle.fuel(),
            carOpTracao: faker.helpers.arrayElement(['Dianteira', 'Traseira', 'Integral']),
            carOpTrocaOleo: faker.date.future({ years: 1 }).toISOString().split('T')[0],
            carOpTrocaPneu: faker.date.future({ years: 2 }).toISOString().split('T')[0],
            carOpRevisao: faker.lorem.words(5),
            carAtivo: true,
            carFavorito: faker.datatype.boolean(),
            fk_usuario_usuID: usuarioAleatorio.usuID,
        }).returning();
        insertedCarros.push(insertedCarro);
    }
    console.log('10 carros inseridos com sucesso.');

    // Geração de dados de Prestador de Serviço (depende de Endereço)
    for (let i = 0; i < 3; i++) {
        const enderecoAleatorio = insertedEnderecos[Math.floor(Math.random() * insertedEnderecos.length)];
        const [insertedPrestador] = await db.insert(prestadorServico).values({
            mecCNPJ: faker.string.numeric(14),
            mecNota: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
            mecNome: faker.company.name(),
            mecEnderecoNum: faker.number.int({ min: 100, max: 5000 }),
            mecLogin: `prestador${i + 1}@prestador.com`,
            mecSenha: hashedPassword,
            mecAtivo: true,
            mecVerificado: true, // Prestadores seed já verificados
            fk_endereco_endCEP: enderecoAleatorio.endCEP,
        }).returning();
        insertedPrestadores.push(insertedPrestador);
    }
    console.log('3 prestadores de serviço inseridos com sucesso.');

    // Inserir prestador fixo solicitado: Rua Minas Gerais, 107 - Jardim Rosinha, São Paulo - SP
    // Primeiro garantir endereço específico
    const enderecoPrestadorFixo = {
        endCEP: '05274090', // CEP atualizado conforme solicitado
        endRua: 'Rua Minas Gerais',
        endBairro: 'Jardim Rosinha',
        endCidade: 'São Paulo',
        endEstado: 'SP',
    };

    const [insertedEnderecoFixo] = await db.insert(endereco).values(enderecoPrestadorFixo).onConflictDoNothing().returning();
    insertedEnderecos.push(insertedEnderecoFixo);

    // Inserir prestador associado ao endereço fixo
    const [prestadorFixo] = await db.insert(prestadorServico).values({
        mecCNPJ: '11111111000191', // CNPJ fictício
        mecNota: 4.5,
        mecNome: 'Oficina Minas Gerais',
        mecEnderecoNum: 107,
        mecLogin: 'minasgerais@prestador.com',
        mecSenha: hashedPassword,
        mecAtivo: true,
        mecVerificado: true,
        fk_endereco_endCEP: enderecoPrestadorFixo.endCEP,
    }).returning();
    insertedPrestadores.push(prestadorFixo);
    console.log('Prestador fixo (Rua Minas Gerais, 107) inserido com sucesso.');

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
    const statusPossiveis = ['pendente', 'proposta', 'aceito', 'recusado', 'em_andamento', 'concluído', 'cancelado'];
    
    for (let i = 0; i < 15; i++) {
        const carroAleatorio = insertedCarros[Math.floor(Math.random() * insertedCarros.length)];
        const enderecoAleatorio = insertedEnderecos[Math.floor(Math.random() * insertedEnderecos.length)];
        const tipoServicoAleatorio = insertedTiposServico[Math.floor(Math.random() * insertedTiposServico.length)];
        
        // Decidir se o serviço terá prestador vinculado
        const temPrestador = faker.datatype.boolean();
        const prestadorAleatorio = temPrestador 
            ? insertedPrestadores[Math.floor(Math.random() * insertedPrestadores.length)]
            : null;
        
        // Definir status baseado se tem prestador ou não
        let status: string;
        if (!temPrestador) {
            status = 'pendente'; // Sem prestador, sempre pendente
        } else {
            // Com prestador, pode ter qualquer status exceto pendente
            status = faker.helpers.arrayElement(['proposta', 'aceito', 'em_andamento', 'concluído', 'recusado']);
        }
        
        // Gerar valor se o status for proposta, em_andamento ou concluído
        const valor = ['proposta', 'em_andamento', 'concluído'].includes(status)
            ? faker.number.float({ min: 100, max: 2000, fractionDigits: 2 })
            : null;
        
        // Gerar nota e comentário apenas para serviços concluídos
        const notaCliente = status === 'concluído' 
            ? faker.number.int({ min: 1, max: 5 })
            : null;
        const comentarioCliente = status === 'concluído'
            ? faker.lorem.sentence()
            : null;
        
        await db.insert(registroServico).values({
            regCodigo: nanoid(),
            regDescricao: faker.lorem.sentence(),
            regData: faker.date.past({ years: 1 }).toISOString().split('T')[0],
            regHora: faker.date.recent(),
            regStatus: status,
            regValor: valor,
            regNotaCliente: notaCliente,
            regComentarioCliente: comentarioCliente,
            regLatitude: faker.location.latitude(),
            regLongitude: faker.location.longitude(),
            fk_carro_carID: carroAleatorio.carID,
            fk_prestador_servico_mecCNPJ: prestadorAleatorio?.mecCNPJ || null,
            fk_tipo_servico_tseID: tipoServicoAleatorio.tseID,
        });
    }
    console.log('15 registros de serviço inseridos com sucesso.');

    // Geração de Chats INDEPENDENTES (sem registro de serviço)
    console.log('Iniciando geração de chats independentes (sem serviço)...');
    
    for (let i = 0; i < 5; i++) { // Adiciona 5 chats independentes
        const usuarioAleatorio = insertedUsuarios[Math.floor(Math.random() * insertedUsuarios.length)];
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
                // fk_registro_servico_regID é omitido (será NULL)
            }).returning();

            // Gerar 1 ou 2 mensagens para este chat independente
            await db.insert(mensagem).values([
                {
                    menID: uuidv4(),
                    menConteudo: `Olá, ${prestadorAleatorio.mecLogin}, gostaria de um orçamento.`,
                    fk_remetente_usuID: usuarioAleatorio.usuID,
                    fk_chat_chatID: insertedChat.chatID,
                },
                {
                    menID: uuidv4(),
                    menConteudo: `Claro, ${usuarioAleatorio.usuNome}. Do que precisa?`,
                    fk_remetente_usuID: prestadorAleatorio.mecCNPJ,
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