import { db } from './connection.ts';
import { fakerPT_BR as faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { carro } from './schema/carro.ts';
import { endereco } from './schema/endereco.ts';
import { mensagem } from './schema/mensagem.ts';
import { prestadorServico } from './schema/prestadorServico.ts';
import { registroServico } from './schema/registroServico.ts';
import { tipoServico } from './schema/tipoServico.ts';
import { usuario } from './schema/usuario.ts';

async function seed() {
    console.log('Iniciando o processo de seed...');
    
    // Limpar tabelas existentes para evitar duplicações
    await db.delete(mensagem);
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
            endCEP: faker.location.zipCode('#####-###'),
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
    const plainPassword = '1234A@';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

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
            carOpTrocaOleo: faker.date.future({ years: 1 }).toISOString().split('T')[0],
            carOpTrocaPneu: faker.date.future({ years: 2 }).toISOString().split('T')[0],
            carOpRevisao: faker.lorem.words(5),
            carAtivo: true,
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
            mecNota: faker.number.float({ min: 1, max: 5}),
            mecEnderecoNum: faker.number.int({ min: 100, max: 5000 }),
            mecLogin: faker.internet.username(),
            mecSenha: hashedPassword,
            mecAtivo: true,
            fk_endereco_endCEP: enderecoAleatorio.endCEP,
        }).returning();
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
        
        const [insertedRegistro] = await db.insert(registroServico).values({
            regID: uuidv4(),
            regDescricao: faker.lorem.sentence(),
            regData: faker.date.past({ years: 1 }).toISOString().split('T')[0],
            regHora: faker.date.recent(),
            fk_endereco_endCEP: prestadorAleatorio.fk_endereco_endCEP,
            fk_carro_carID: carroAleatorio.carID,
            fk_prestador_servico_mecCNPJ: prestadorAleatorio.mecCNPJ,
            fk_tipo_servico_tseID: tipoServicoAleatorio.tseID,
        }).returning();
        
        // Geração de dados de Mensagem para cada registro de serviço
        if (faker.datatype.boolean()) {
            await db.insert(mensagem).values({
                menID: uuidv4(),
                menSender: faker.person.fullName(),
                menConteudo: faker.lorem.sentence(),
                fk_registro_servico_regID: insertedRegistro.regID,
            });
        }
    }
    console.log('15 registros de serviço e mensagens associadas inseridos com sucesso.');
    
    console.log('Processo de seed finalizado com sucesso!');
}

seed().catch((err) => {
    console.error('Erro durante o seed:', err);
    process.exit(1);
});