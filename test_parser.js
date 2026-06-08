import { JSDOM } from "jsdom";

const xmlData = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><CompNfse xmlns="http://www.giss.com.br/tipos-v2_04.xsd" xmlns:ns2="http://www.w3.org/2000/09/xmldsig#" xmlns:ns3="http://www.giss.com.br/cabecalho-v2_04.xsd"><Nfse versao="2.00"><InfNfse Id="4456194"><Numero>355</Numero><CodigoVerificacao>CQHAQVF77</CodigoVerificacao><DataEmissao>2026-04-08T17:24:23.736-03:00</DataEmissao><ValoresNfse><BaseCalculo>785.50</BaseCalculo><Aliquota>2.00</Aliquota><ValorIss>15.71</ValorIss><ValorLiquidoNfse>737.18</ValorLiquidoNfse></ValoresNfse><DescricaoCodigoTributacaoMunicipio>Atividade M?dica Ambulatorial Com Recursos Para Realiza??o De Exames Complementares</DescricaoCodigoTributacaoMunicipio><PrestadorServico><RazaoSocial>A. G. PIMENTA SERVICOS MEDICOS LTDA</RazaoSocial><Endereco><Endereco> Inu?ba</Endereco><Numero>480</Numero><Complemento>,LOTE 22,QUADRA 33</Complemento><Bairro>S?o Bento</Bairro><CodigoMunicipio>3536505</CodigoMunicipio><Uf>SP</Uf><Cep>13142551</Cep></Endereco><Contato><Telefone>81184674</Telefone><Email>documentosecontabil@gmail.com</Email></Contato></PrestadorServico><OrgaoGerador><CodigoMunicipio>3536505</CodigoMunicipio><Uf>SP</Uf></OrgaoGerador><DeclaracaoPrestacaoServico><InfDeclaracaoPrestacaoServico Id="4456194"><Competencia>2026-04-08-03:00</Competencia><Servico><Valores><ValorServicos>785.50</ValorServicos><ValorDeducoes>0.00</ValorDeducoes><ValorInss>0.00</ValorInss><ValorIr>11.78</ValorIr><ValorCsll>7.86</ValorCsll><OutrasRetencoes>0.00</OutrasRetencoes><ValTotTributos>0.00</ValTotTributos><ValorIss>15.71</ValorIss><Aliquota>2.00</Aliquota><DescontoIncondicionado>0.00</DescontoIncondicionado><DescontoCondicionado>0.00</DescontoCondicionado><trib><tribFed><piscofins><CST>1</CST><vBCPisCofins>785.50</vBCPisCofins><pAliqPis>0.65</pAliqPis><pAliqCofins>3.00</pAliqCofins><vPis>5.11</vPis><vCofins>23.57</vCofins><tpRetPisCofins>1</tpRetPisCofins></piscofins></tribFed><totTrib><pTotTrib><pTotTribFed>0.00</pTotTribFed><pTotTribEst>0.00</pTotTribEst><pTotTribMun>0.00</pTotTribMun></pTotTrib><pTotTribSN>0.00</pTotTribSN></totTrib></trib><IBSCBS><finNFSe>1</finNFSe><indFinal>0</indFinal><valores><trib><gIBSCBS><CST></CST><cClassTrib></cClassTrib></gIBSCBS></trib><vBC>741.11</vBC></valores></IBSCBS></Valores><IssRetido>2</IssRetido><ItemListaServico>04.03</ItemListaServico><CodigoTributacaoMunicipio>863050200</CodigoTributacaoMunicipio><Discriminacao>Servi?os m?dicos prestados</Discriminacao><CodigoMunicipio>3536505</CodigoMunicipio><CodigoPais>0076</CodigoPais><ExigibilidadeISS>1</ExigibilidadeISS><MunicipioIncidencia>3536505</MunicipioIncidencia></Servico><Prestador><CpfCnpj><Cnpj>45891159000181</Cnpj></CpfCnpj><InscricaoMunicipal>60353</InscricaoMunicipal></Prestador><TomadorServico><IdentificacaoTomador><CpfCnpj><Cnpj>59571600000152</Cnpj></CpfCnpj></IdentificacaoTomador><RazaoSocial>RADIO PRIME SERVICOS MEDICOS LTDA</RazaoSocial><Endereco><Endereco>Rua Avertano Rocha</Endereco><Numero>192</Numero><Bairro>Campina</Bairro><CodigoMunicipio>1501402</CodigoMunicipio><Uf>PA</Uf><Cep>66023120</Cep></Endereco><Contato><Telefone>6192004244</Telefone><Email>teleradioprime@gmail.com</Email></Contato></TomadorServico><OptanteSimplesNacional>2</OptanteSimplesNacional><IncentivoFiscal>2</IncentivoFiscal></InfDeclaracaoPrestacaoServico></DeclaracaoPrestacaoServico></InfNfse></Nfse></CompNfse>`;

const dom = new JSDOM("");
const parser = new dom.window.DOMParser();
const doc = parser.parseFromString(xmlData, "text/xml");

const getNS = (parent, localName) => {
    if (!parent) return null;
    const elements = parent.getElementsByTagNameNS('*', localName);
    return elements.length > 0 ? elements[0] : null;
};

const getTextNS = (parent, localName, def = "") => {
    const node = getNS(parent, localName);
    return node ? node.textContent.trim() : def;
};

const infNfse = doc.getElementsByTagNameNS('*', 'InfNfse')[0];

const parent = infNfse.parentElement;
const declaracao = getNS(parent, 'InfDeclaracaoPrestacaoServico') || getNS(infNfse, 'InfDeclaracaoPrestacaoServico') || getNS(parent, 'DeclaracaoPrestacaoServico') || getNS(infNfse, 'DeclaracaoPrestacaoServico');

const prestadorServicoNode = getNS(infNfse, 'PrestadorServico');
const prestadorIdentificacaoNode = getNS(declaracao, 'Prestador');
const prestadorNode = prestadorServicoNode || prestadorIdentificacaoNode;
           
const prestadorDocNodeSource = prestadorIdentificacaoNode || prestadorNode;
const prestadorDocNode = getNS(prestadorDocNodeSource, 'CpfCnpj') || getNS(getNS(prestadorDocNodeSource, 'IdentificacaoPrestador'), 'CpfCnpj');

const c = (getTextNS(prestadorDocNode, 'Cnpj') || getTextNS(prestadorDocNode, 'Cpf') || getTextNS(getNS(prestadorNode, 'IdentificacaoPrestador'), 'Cnpj') || getTextNS(getNS(prestadorNode, 'IdentificacaoPrestador'), 'Cpf') || getTextNS(prestadorNode, 'Cnpj') || getTextNS(prestadorNode, 'Cpf') || '').replace(/\D/g, '');

const tomadorNode = getNS(declaracao, 'TomadorServico') || getNS(declaracao, 'Tomador');
const tomadorDocNode = getNS(tomadorNode, 'CpfCnpj') || getNS(getNS(tomadorNode, 'IdentificacaoTomador'), 'CpfCnpj');
const t = (getTextNS(tomadorDocNode, 'Cnpj') || getTextNS(tomadorDocNode, 'Cpf') || getTextNS(getNS(tomadorNode, 'IdentificacaoTomador'), 'Cnpj') || getTextNS(getNS(tomadorNode, 'IdentificacaoTomador'), 'Cpf') || getTextNS(tomadorNode, 'Cnpj') || getTextNS(tomadorNode, 'Cpf') || '').replace(/\D/g, '');
console.log("Found Tomador CNPJ:", t);
