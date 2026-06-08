import fs from 'fs';
import { JSDOM } from 'jsdom';

const xmlData = fs.readFileSync('aracariguama.xml', 'utf8');

const dom = new JSDOM("");
const parser = new dom.window.DOMParser();
const doc = parser.parseFromString(xmlData, "text/xml");

// Mock functions from index.html
function safeParseFloat(value) {
    if (typeof value !== 'string') value = String(value || '0');
    value = value.trim();
    if (!value) return 0;
    const hasComma = value.indexOf(',') !== -1;
    const hasDot = value.indexOf('.') !== -1;
    if (hasComma && !hasDot) return parseFloat(value.replace(',', '.'));
    if (hasComma && hasDot) {
        if (value.lastIndexOf(',') > value.lastIndexOf('.')) return parseFloat(value.replace(/\./g, '').replace(',', '.'));
        return parseFloat(value.replace(/,/g, ''));
    }
    return parseFloat(value);
}

function normalizeName(name) { return name; }
function findIBGECode(city, uf) { return "1234567"; }

function mapearAracariguama(notaNode, config) {
    const getValTag = (tag) => {
        const els = notaNode.getElementsByTagName(tag);
        return els.length > 0 ? els[0].textContent.trim() : '';
    };
    
    const status = getValTag('SituacaoNF');
    
    const emissaoRaw = getValTag('Emissao');
    let dataEmissao = '';
    if (emissaoRaw) {
        const dataEmissaoParts = emissaoRaw.split(' ')[0].split('/');
        if (dataEmissaoParts.length === 3) {
            dataEmissao = `${dataEmissaoParts[2]}-${dataEmissaoParts[1]}-${dataEmissaoParts[0]}`;
        }
    }
    
    const docRoot = notaNode.ownerDocument;
    const headerCnpjEls = docRoot.getElementsByTagName('CNPJCPFPrestador');
    const prestadorDoc = headerCnpjEls.length > 0 ? headerCnpjEls[0].textContent.trim() : config.cnpjPrestador;

    let itemListaServico = '';
    const codServicoRaw = getValTag('CodigoServico');
    if (codServicoRaw) {
        const match = codServicoRaw.match(/^\s*(\d{2})[-.](\d{2})/);
        if (match) {
            itemListaServico = `${match[1]}.${match[2]}`;
        } else {
            itemListaServico = codServicoRaw.split(' ')[0];
        }
    }

    const getImposto = (nome) => {
        const impostos = notaNode.getElementsByTagName('DadosImpostosNotaFiscal');
        for (let i = 0; i < impostos.length; i++) {
            const imp = impostos[i];
            const descEls = imp.getElementsByTagName('Imposto');
            if (descEls.length > 0 && descEls[0].textContent.trim() === nome) {
                const valEls = imp.getElementsByTagName('ValorImposto');
                if (valEls.length > 0) return safeParseFloat(valEls[0].textContent.trim());
            }
        }
        return 0;
    };

    const valorPis = getImposto('PIS');
    const valorCofins = getImposto('COFINS');
    const valorInss = getImposto('INSS');
    const valorIr = getImposto('IRRF') || getImposto('IRPJ'); 
    const valorCsll = getImposto('CSLL');

    const isRetido = getValTag('Retido') === 'S';

    const aliqRaw = getValTag('Aliquota');
    let aliquota = safeParseFloat(aliqRaw) || 0;

    const cidadeTomador = getValTag('CidadeTomador');
    const ufTomador = getValTag('UFTomador');
    let tomadorCodMun = '';
    if (cidadeTomador && ufTomador) {
        tomadorCodMun = findIBGECode(cidadeTomador, ufTomador) || '';
    }

    return {
        numero: getValTag('NumeroNF'),
        codigoVerificacao: getValTag('ChaveValidacao'),
        dataEmissao: dataEmissao,
        competencia: dataEmissao,
        discriminacao: getValTag('TextoItem'),
        situacao: (status === 'C' || status === 'CANCELADA') ? 'CANCELADA' : 'NORMAL',
        valorServico: safeParseFloat(getValTag('ValorItem') || getValTag('ValorTotalNota')),
        valorDeducao: safeParseFloat(getValTag('ValorDeducao')),
        valorPis: valorPis,
        valorCofins: valorCofins,
        valorInss: valorInss,
        valorIr: valorIr,
        valorCsll: valorCsll,
        issRetido: isRetido ? '1' : '2',
        valorIss: safeParseFloat(getValTag('ValorISS') || getImposto('ISSQN')),
        valorIssRetido: isRetido ? safeParseFloat(getValTag('ValorISS') || getImposto('ISSQN')) : 0,
        aliquota: aliquota,
        itemLista: itemListaServico,
        codigoTributacaoMunicipio: getValTag('ItemAtividade'),
        codCnae: '',
        codMunPrestacao: '',
        prestacaoLocal: '',
        exigibilidadeISS: '1',
        optanteSimples: '2',
        prestadorCnpj: prestadorDoc.replace(/\D/g, ''),
        prestadorIM: getValTag('InscriçãoMunicipalPrestador'),
        prestadorRazao: config.razaoSocialPrestador || '', 
        prestadorEnd: getValTag('EnderecoLocalPrestacao'),
        prestadorNum: getValTag('NumeroLocalPrestacao'),
        prestadorComp: getValTag('ComplementoLocalPrestacao'),
        prestadorBairro: getValTag('BairroLocalPrestacao'),
        tomadorDoc: getValTag('CNPJCPFTomador').replace(/\D/g, ''),
        tomadorRazao: normalizeName(getValTag('NomeTomador')),
        tomadorEnd: getValTag('EnderecoTomador'),
        tomadorNum: getValTag('NumeroTomador'),
        tomadorComp: getValTag('ComplementoTomador'),
        tomadorBairro: getValTag('BairroTomador'),
        tomadorCodMun: tomadorCodMun,
        tomadorUF: ufTomador,
        tomadorCEP: getValTag('CEPTomador'),
        tomadorEmail: getValTag('EmailTomador')
    };
}

const aracariguamaNodes = doc.querySelectorAll('DadosNotaFiscal');
if (aracariguamaNodes.length > 0 && doc.querySelector('ISSEConsultaNotaRetorno')) {
    console.log(`Processando XML (padrão Araçariguama-SP - ${aracariguamaNodes.length} notas)`);
    const results = Array.from(aracariguamaNodes).map(node => mapearAracariguama(node, { cnpjPrestador: '000000', razaoSocialPrestador: 'TESTE' })).filter(Boolean);
    console.log(JSON.stringify(results[0], null, 2));
}
