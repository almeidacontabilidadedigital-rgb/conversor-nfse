import fs from 'fs';
import { JSDOM } from 'jsdom';

const xmlData = fs.readFileSync('nacional.xml', 'utf8');

const dom = new JSDOM("");
const parser = new dom.window.DOMParser();

let validXml = `<xml>` + xmlData.replace(/<\?xml.*?\?>/g, '') + `</xml>`;
const doc = parser.parseFromString(validXml, "text/xml");

const getNS = (parent, localName) => {
    if (!parent || !parent.getElementsByTagNameNS) return null;
    const elements = parent.getElementsByTagNameNS('*', localName);
    if (elements.length > 0) return elements[0];
    const elementsNoNs = parent.getElementsByTagName(localName);
    return elementsNoNs.length > 0 ? elementsNoNs[0] : null;
};

const getTextNS = (parent, localName, def = "") => {
    const node = getNS(parent, localName);
    return node ? node.textContent.trim() : def;
};

// Mock functions
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

function mapearNacional(notaNode, config) {
    // notaNode is expected to be <NFSe>
    const infNFSe = getNS(notaNode, 'infNFSe') || notaNode;
    const dpsNode = getNS(infNFSe, 'infDPS') || getNS(infNFSe, 'DPS');
    
    if (!dpsNode) return null;

    const servNode = getNS(dpsNode, 'serv');
    const valoresDpsNode = getNS(dpsNode, 'valores');
    const valoresNfseNode = getNS(infNFSe, 'valores');
    const tomaNode = getNS(dpsNode, 'toma');
    const emitNode = getNS(infNFSe, 'emit') || getNS(dpsNode, 'prest');

    const statusObj = getNS(infNFSe, 'cStat');
    let status = 'NORMAL';
    const outInf = getTextNS(infNFSe, 'xOutInf');
    if ((statusObj && statusObj.textContent.trim() !== '100') || outInf.toUpperCase().includes('NOTA CANCELADA POR MOTIVO')) {
        status = 'CANCELADA';
    }

    const nNFSe = getTextNS(infNFSe, 'nNFSe');
    const codigoVerificacao = getTextNS(infNFSe, 'nDFSe') || nNFSe; 
    let dataEmissaoRaw = getTextNS(dpsNode, 'dhEmi') || getTextNS(infNFSe, 'dhProc');
    let dataEmissao = '';
    if (dataEmissaoRaw) {
        dataEmissaoRaw = dataEmissaoRaw.split('T')[0];
        dataEmissao = dataEmissaoRaw;
    }
    
    let competenciaRaw = getTextNS(dpsNode, 'dCompet');
    let competencia = '';
    if (competenciaRaw) {
        competencia = competenciaRaw.split('T')[0];
    } else {
        competencia = dataEmissao;
    }

    const servDescNode = getNS(servNode, 'xDescServ');
    const discriminacao = servDescNode ? servDescNode.textContent.trim() : '';

    const prestadorCNPJ = getTextNS(emitNode, 'CNPJ');
    const prestadorCPF = getTextNS(emitNode, 'CPF');
    const prestadorDoc = (prestadorCNPJ || prestadorCPF).replace(/\D/g, '');

    const prestadorRazao = getTextNS(emitNode, 'xNome') || config.razaoSocialPrestador || '';

    const tomadorCNPJ = getTextNS(tomaNode, 'CNPJ');
    const tomadorCPF = getTextNS(tomaNode, 'CPF');
    const tomadorDoc = (tomadorCNPJ || tomadorCPF).replace(/\D/g, '');
    const tomadorRazao = getTextNS(tomaNode, 'xNome');

    const endNac = getNS(tomaNode, 'endNac') || getNS(tomaNode, 'end');
    const tomadorCodMun = getTextNS(endNac, 'cMun') || '';
    const tomadorCEP = getTextNS(endNac, 'CEP') || '';
    
    const tomadorEmail = getTextNS(tomaNode, 'email');
    
    let valorServico = 0, valorDeducao = 0, valorPis = 0, valorCofins = 0, valorInss = 0, valorIr = 0, valorCsll = 0, valorIss = 0, aliquota = 0, issRetido = '2';
    
    if (valoresNfseNode) {
        valorIss = safeParseFloat(getTextNS(valoresNfseNode, 'vISSQN'));
        aliquota = safeParseFloat(getTextNS(valoresNfseNode, 'pAliqAplic'));
    }

    if (valoresDpsNode) {
        valorServico = safeParseFloat(getTextNS(valoresDpsNode, 'vServ'));
        valorDeducao = safeParseFloat(getTextNS(valoresDpsNode, 'vDeducao'));
        
        const tribFed = getNS(valoresDpsNode, 'tribFed');
        if (tribFed) {
            valorPis = safeParseFloat(getTextNS(tribFed, 'vPis'));
            valorCofins = safeParseFloat(getTextNS(tribFed, 'vCofins'));
            valorInss = safeParseFloat(getTextNS(tribFed, 'vINSS'));
            valorIr = safeParseFloat(getTextNS(tribFed, 'vIRRF')) || safeParseFloat(getTextNS(tribFed, 'vRetIRRF'));
            valorCsll = safeParseFloat(getTextNS(tribFed, 'vCSLL'));
        }
        
        const tribMun = getNS(valoresDpsNode, 'tribMun');
        if (tribMun) {
            issRetido = getTextNS(tribMun, 'tpRetISSQN') === '2' ? '1' : '2'; 
        }
    }

    return {
        numero: nNFSe,
        codigoVerificacao,
        dataEmissao,
        competencia,
        discriminacao,
        situacao: status,
        valorServico,
        valorDeducao,
        valorPis,
        valorCofins,
        valorInss,
        valorIr,
        valorCsll,
        issRetido,
        valorIss,
        valorIssRetido: issRetido === '1' ? valorIss : 0,
        aliquota,
        itemLista: getTextNS(servNode, 'cTribNac') || '',
        codigoTributacaoMunicipio: getTextNS(servNode, 'cNBS') || '',
        prestadorCnpj: prestadorDoc,
        prestadorIM: getTextNS(emitNode, 'IM'),
        prestadorRazao,
        tomadorDoc,
        tomadorRazao,
        tomadorEnd: getTextNS(endNac, 'xLgr') || getTextNS(tomaNode, 'xLgr'),
        tomadorNum: getTextNS(endNac, 'nro') || getTextNS(tomaNode, 'nro'),
        tomadorComp: getTextNS(endNac, 'xCpl') || getTextNS(tomaNode, 'xCpl'),
        tomadorBairro: getTextNS(endNac, 'xBairro') || getTextNS(tomaNode, 'xBairro'),
        tomadorCodMun,
        tomadorUF: '', 
        tomadorCEP,
        tomadorEmail
    };
}

const nNodes = doc.querySelectorAll('NFSe');
console.log("Found NFSe:", nNodes.length);
if (nNodes.length > 0) {
    const res = mapearNacional(nNodes[0], { razaoSocialPrestador: "TESTE" });
    console.log(JSON.stringify(res, null, 2));
}

