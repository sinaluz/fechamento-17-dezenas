import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

// --- Helper Functions ---

// Calculate Frequency
const calculateFrequency = (data) => {
  if (!data || data.length === 0) return {};
  const frequency = {};
  for (let i = 1; i <= 25; i++) frequency[i] = 0;
  data.forEach(concurso => {
    concurso.dezenas.forEach(dezena => {
      if (frequency[dezena] !== undefined) frequency[dezena]++;
    });
  });
  return frequency;
};

// Calculate Even/Odd distribution
const calculateEvenOdd = (data) => {
    if (!data || data.length === 0) return {};
    const evenOddCounts = {};
    data.forEach(concurso => {
        let evenCount = 0;
        concurso.dezenas.forEach(dezena => {
            if (dezena % 2 === 0) evenCount++;
        });
        const oddCount = 15 - evenCount;
        const key = `${evenCount}_${oddCount}`;
        evenOddCounts[key] = (evenOddCounts[key] || 0) + 1;
    });
    return evenOddCounts;
};

// Calculate Sum distribution
const calculateSumDistribution = (data) => {
    if (!data || data.length === 0) return {};
    const sumCounts = {};
    data.forEach(concurso => {
        const sum = concurso.dezenas.reduce((acc, dezena) => acc + dezena, 0);
        sumCounts[sum] = (sumCounts[sum] || 0) + 1;
    });
    return sumCounts;
};

// Calculate Repeated Numbers distribution
const calculateRepeatedNumbers = (data) => {
    if (!data || data.length < 2) return {};
    const repeatedCounts = {};
    const sortedData = [...data].sort((a, b) => a.concurso - b.concurso);
    for (let i = 1; i < sortedData.length; i++) {
        const currentDezenas = new Set(sortedData[i].dezenas);
        const previousDezenas = new Set(sortedData[i - 1].dezenas);
        let repeatedCount = 0;
        currentDezenas.forEach(dezena => {
            if (previousDezenas.has(dezena)) repeatedCount++;
        });
        repeatedCounts[repeatedCount] = (repeatedCounts[repeatedCount] || 0) + 1;
    }
    return repeatedCounts;
};

// Calculate Prime Numbers distribution
const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
const calculatePrimeNumbers = (data) => {
    if (!data || data.length === 0) return {};
    const primeCountsDistribution = {};
    data.forEach(concurso => {
        let primeCount = 0;
        concurso.dezenas.forEach(dezena => {
            if (PRIMES.has(dezena)) {
                primeCount++;
            }
        });
        primeCountsDistribution[primeCount] = (primeCountsDistribution[primeCount] || 0) + 1;
    });
    return primeCountsDistribution;
};


// --- App Component ---
function App() {
  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for Game Generator
  const [fixedNumbers, setFixedNumbers] = useState(new Set());
  const [excludedNumbers, setExcludedNumbers] = useState(new Set());
  const [generatedGame, setGeneratedGame] = useState(null);
  const [generatorError, setGeneratorError] = useState(null);

  // Process sheet data (remains the same)
  const processSheetData = (jsonData) => {
    if (!jsonData || jsonData.length === 0) return [];
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    const concursoIndex = headers.findIndex(h => String(h).trim() === 'Concurso');
    const dataIndex = headers.findIndex(h => String(h).trim() === 'Data Sorteio');
    const bolaIndices = [];
    for (let i = 1; i <= 15; i++) {
      const bolaIndex = headers.findIndex(h => String(h).trim() === `Bola${i}`);
      if (bolaIndex === -1) throw new Error(`Coluna Bola${i} não encontrada.`);
      bolaIndices.push(bolaIndex);
    }
    if (concursoIndex === -1 || dataIndex === -1) throw new Error('Colunas essenciais (Concurso, Data Sorteio) não encontradas.');

    const processed = dataRows.map((row, rowIndex) => {
      try {
        const dezenas = bolaIndices.map(index => parseInt(row[index], 10)).filter(num => !isNaN(num));
        if (dezenas.length !== 15) {
            console.warn(`Linha ${rowIndex + 2}: Número incorreto de dezenas (${dezenas.length}). Pulando linha.`);
            return null;
        }
        let dataSorteio = row[dataIndex];
        if (typeof dataSorteio === 'number') {
            dataSorteio = XLSX.SSF.format('dd/mm/yyyy', dataSorteio);
        }
        return {
          concurso: parseInt(row[concursoIndex], 10),
          data: dataSorteio,
          dezenas: dezenas.sort((a, b) => a - b)
        };
      } catch (rowError) {
          console.error(`Erro ao processar linha ${rowIndex + 2}:`, rowError, row);
          return null;
      }
    }).filter(item => item !== null && !isNaN(item.concurso));
    return processed;
  };

  // Handle file upload (remains the same)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    setRawData([]);
    setProcessedData([]);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        setRawData(jsonData);
        const processed = processSheetData(jsonData);
        setProcessedData(processed);
        if (processed.length === 0 && jsonData.length > 1) {
            setError('Nenhum dado válido encontrado. Verifique a estrutura do arquivo.');
        } else {
            setError(null);
        }
      } catch (err) {
        console.error("Erro ao processar:", err);
        setError(`Erro ao processar: ${err.message}`);
        setProcessedData([]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = (err) => {
      console.error("Erro ao ler:", err);
      setError('Erro ao ler o arquivo.');
      setIsLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  // --- Memoized Calculations ---
  const frequencyData = useMemo(() => calculateFrequency(processedData), [processedData]);
  const sortedFrequency = useMemo(() => {
      return Object.entries(frequencyData)
          .map(([number, count]) => ({ number: parseInt(number), count }))
          .sort((a, b) => b.count - a.count);
  }, [frequencyData]);

  const evenOddData = useMemo(() => calculateEvenOdd(processedData), [processedData]);
  const sortedEvenOdd = useMemo(() => {
      return Object.entries(evenOddData)
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => {
              const [aEven] = a.key.split('_').map(Number);
              const [bEven] = b.key.split('_').map(Number);
              return aEven - bEven;
          });
  }, [evenOddData]);

  const sumDistributionData = useMemo(() => calculateSumDistribution(processedData), [processedData]);
  const sortedSumDistribution = useMemo(() => {
      return Object.entries(sumDistributionData)
          .map(([sum, count]) => ({ sum: parseInt(sum), count }))
          .sort((a, b) => a.sum - b.sum);
  }, [sumDistributionData]);

  const repeatedNumbersData = useMemo(() => calculateRepeatedNumbers(processedData), [processedData]);
  const sortedRepeatedNumbers = useMemo(() => {
      return Object.entries(repeatedNumbersData)
          .map(([repeated, count]) => ({ repeated: parseInt(repeated), count }))
          .sort((a, b) => a.repeated - b.repeated);
  }, [repeatedNumbersData]);

  const primeNumbersData = useMemo(() => calculatePrimeNumbers(processedData), [processedData]);
  // Sort prime numbers data for display
  const sortedPrimeNumbers = useMemo(() => {
      return Object.entries(primeNumbersData)
          .map(([primeCount, count]) => ({ primeCount: parseInt(primeCount), count }))
          .sort((a, b) => a.primeCount - b.primeCount); // Sort by number of primes
  }, [primeNumbersData]);

  const molduraMioloData = useMemo(() => calculateMolduraMiolo(processedData), [processedData]);
  const sortedMolduraMiolo = useMemo(() => {
      return Object.entries(molduraMioloData)
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => {
              const [aMoldura] = a.key.split('_').map(Number);
              const [bMoldura] = b.key.split('_').map(Number);
              return aMoldura - bMoldura; // Sort by number of moldura numbers
          });
  }, [molduraMioloData]);

  // --- Handler for Game Generator ---
  const handleGenerateGame = () => {
    setGeneratorError(null);
    setGeneratedGame(null);
    const result = generateGame(fixedNumbers, excludedNumbers);
    if (result.error) {
      setGeneratorError(result.error);
    } else {
      setGeneratedGame(result.game);
    }
  };

  // --- Render ---
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700">Análise Lotofácil</h1>

      {/* --- Import Section --- */}
      <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Importar Resultados</h2>
        <p className="text-gray-600 mb-5">Selecione o arquivo Excel (.xlsx, .xls) com os resultados baixado do site da Caixa.</p>
        {/* ... (Import UI remains the same) ... */}
        <div className="mb-4">
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline inline-block transition duration-300 ease-in-out"
          >
            Selecionar Arquivo
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          {fileName && <span className="ml-4 text-gray-700 italic">{fileName}</span>}
        </div>
        {isLoading && <p className="text-indigo-600 animate-pulse">Processando arquivo...</p>}
        {error && <p className="text-red-600 font-semibold mt-2">{error}</p>}
        {processedData.length > 0 && !error && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2 text-green-700">Dados Importados com Sucesso!</h3>
            <p className="text-sm text-gray-600 mb-3">Total de {processedData.length} concursos processados.</p>
            <details className="bg-gray-50 p-3 rounded border">
                <summary className="cursor-pointer font-medium text-sm text-gray-700">Mostrar Prévia (últimos 5)</summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(processedData.slice(-5).reverse(), null, 2)}
                </pre>
            </details>
          </div>
        )}
      </div>

      {/* --- Analysis Section --- */}
      {processedData.length > 0 && !error && (
        <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Análises Estatísticas</h2>

          {/* Frequency Analysis */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700">Frequência das Dezenas</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-sm">
              {sortedFrequency.map(({ number, count }) => (
                <div key={number} className="flex justify-between p-1 border rounded bg-gray-50">
                  <span className="font-bold text-indigo-800 mr-2">{String(number).padStart(2, '0')}:</span>
                  <span className="text-gray-700">{count}</span>
                </div>
              ))}
            </div>
             <div className="mt-4 text-center text-gray-500 italic">[Gráfico de Frequência será adicionado aqui]</div>
          </div>

          {/* Even/Odd Analysis */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700">Distribuição Pares / Ímpares</h3>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Combinação (Pares / Ímpares)</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEvenOdd.map(({ key, count }) => {
                  const [even, odd] = key.split('_');
                  return (
                    <tr key={key}>
                      <td className="px-4 py-2 whitespace-nowrap">{even} Pares / {odd} Ímpares</td>
                      <td className="px-4 py-2 whitespace-nowrap">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 text-center text-gray-500 italic">[Gráfico de Pares/Ímpares será adicionado aqui]</div>
          </div>

          {/* Sum Distribution Analysis */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700">Distribuição da Soma das Dezenas</h3>
            <div className="max-h-60 overflow-y-auto border rounded p-2 bg-gray-50 text-sm">
                {sortedSumDistribution.map(({ sum, count }) => (
                    <div key={sum} className="flex justify-between py-1">
                        <span>Soma {sum}:</span>
                        <span>{count} ocorrência(s)</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 text-center text-gray-500 italic">[Gráfico/Tabela da Soma será adicionado aqui]</div>
          </div>

          {/* Repeated Numbers Analysis */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700">Distribuição de Números Repetidos</h3>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Quantidade de Repetidos</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Quantidade de Concursos</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRepeatedNumbers.map(({ repeated, count }) => (
                    <tr key={repeated}>
                      <td className="px-4 py-2 whitespace-nowrap">{repeated}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{count}</td>
                    </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-center text-gray-500 italic">[Gráfico de Números Repetidos será adicionado aqui]</div>
          </div>

           {/* Prime Numbers Analysis */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700">Distribuição de Números Primos</h3>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Quantidade de Primos</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Quantidade de Concursos</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPrimeNumbers.map(({ primeCount, count }) => (
                    <tr key={primeCount}>
                      <td className="px-4 py-2 whitespace-nowrap">{primeCount}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{count}</td>
                    </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-center text-gray-500 italic">[Gráfico de Números Primos será adicionado aqui]</div>
          </div>

          {/* Moldura/Miolo Analysis */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700">Distribuição Moldura / Miolo</h3>
            <p className="text-sm text-gray-600 mb-2">Moldura: 1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25 (16 números)</p>
            <p className="text-sm text-gray-600 mb-3">Miolo: 7, 8, 9, 12, 13, 14, 17, 18, 19 (9 números)</p>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Combinação (Moldura / Miolo)</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMolduraMiolo.map(({ key, count }) => {
                  const [moldura, miolo] = key.split('_');
                  return (
                    <tr key={key}>
                      <td className="px-4 py-2 whitespace-nowrap">{moldura} Moldura / {miolo} Miolo</td>
                      <td className="px-4 py-2 whitespace-nowrap">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 text-center text-gray-500 italic">[Gráfico de Moldura/Miolo será adicionado aqui]</div>
          </div>

          {/* Placeholder for other analyses */}
          <div className="text-gray-500 italic">
            <p>Outras análises (Ciclos, Moldura/Miolo, Padrões) serão adicionadas aqui...</p>
          </div>
        </div>
      )}

      {/* --- Tools Section --- */}
       {processedData.length > 0 && !error && (
          <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Ferramentas</h2>

              {/* Game Generator */}
              <div className="mb-6 border-b pb-6">
                  <h3 className="text-xl font-semibold mb-3 text-indigo-700">Gerador de Jogos</h3>
                  <p className="text-sm text-gray-600 mb-4">Clique nos números para fixar (verde) ou excluir (vermelho). Clique novamente para limpar.</p>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-4">
                      {[...Array(25).keys()].map(i => {
                          const num = i + 1;
                          const isFixed = fixedNumbers.has(num);
                          const isExcluded = excludedNumbers.has(num);
                          let bgColor = 'bg-gray-200 hover:bg-gray-300';
                          if (isFixed) bgColor = 'bg-green-500 text-white hover:bg-green-600';
                          if (isExcluded) bgColor = 'bg-red-500 text-white hover:bg-red-600';

                          return (
                              <button
                                  key={num}
                                  onClick={() => {
                                      const newFixed = new Set(fixedNumbers);
                                      const newExcluded = new Set(excludedNumbers);
                                      if (isFixed) {
                                          newFixed.delete(num);
                                          newExcluded.add(num);
                                      } else if (isExcluded) {
                                          newExcluded.delete(num);
                                      } else {
                                          if (fixedNumbers.size < 15) {
                                             newFixed.add(num);
                                          } else {
                                             setGeneratorError("Você já fixou o máximo de 15 números.");
                                             setTimeout(() => setGeneratorError(null), 3000); // Clear error after 3s
                                          }
                                      }
                                      setFixedNumbers(newFixed);
                                      setExcludedNumbers(newExcluded);
                                      setGeneratorError(null); // Clear previous errors on interaction
                                      setGeneratedGame(null); // Clear previous game on interaction
                                  }}
                                  className={`font-bold py-2 px-2 rounded text-center transition duration-150 ease-in-out ${bgColor}`}
                              >
                                  {String(num).padStart(2, '0')}
                              </button>
                          );
                      })}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                      <button
                          onClick={handleGenerateGame}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
                      >
                          Gerar Jogo
                      </button>
                      <div className="text-sm">
                          <span className="font-semibold">Fixos:</span> {fixedNumbers.size} | <span className="font-semibold">Excluídos:</span> {excludedNumbers.size}
                      </div>
                  </div>

                  {generatorError && (
                      <p className="text-red-600 font-semibold mb-4">Erro: {generatorError}</p>
                  )}

                  {generatedGame && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded">
                          <h4 className="font-semibold text-green-800 mb-2">Jogo Gerado:</h4>
                          <div className="flex flex-wrap gap-2">
                              {generatedGame.map(num => (
                                  <span key={num} className="bg-green-600 text-white font-bold py-1 px-3 rounded-full text-sm">
                                      {String(num).padStart(2, '0')}
                                  </span>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              {/* Placeholder for Verificador de Jogos */}
              <div className="text-gray-500 italic">
                  <p>Verificador de Jogos será adicionado aqui...</p>
              </div>
          </div>
      )}

    </div>
  );
}

export default App;



// Calculate Moldura/Miolo distribution
const MOLDURA = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
const calculateMolduraMiolo = (data) => {
    if (!data || data.length === 0) return {};
    const molduraMioloCounts = {};
    data.forEach(concurso => {
        let molduraCount = 0;
        concurso.dezenas.forEach(dezena => {
            if (MOLDURA.has(dezena)) {
                molduraCount++;
            }
        });
        const mioloCount = 15 - molduraCount;
        const key = `${molduraCount}_${mioloCount}`;
        molduraMioloCounts[key] = (molduraMioloCounts[key] || 0) + 1;
    });
    return molduraMioloCounts;
};



// --- Game Generator Logic ---
const generateGame = (fixed = new Set(), excluded = new Set()) => {
    // Validation
    if (fixed.size > 15) {
        return { error: "Você não pode fixar mais de 15 números." };
    }
    const intersection = new Set([...fixed].filter(num => excluded.has(num)));
    if (intersection.size > 0) {
        return { error: `Os números ${[...intersection].join(", ")} não podem ser fixados E excluídos ao mesmo tempo.` };
    }
    const availableNumbers = [];
    for (let i = 1; i <= 25; i++) {
        if (!excluded.has(i) && !fixed.has(i)) {
            availableNumbers.push(i);
        }
    }
    const numbersToPick = 15 - fixed.size;
    if (numbersToPick < 0) {
         return { error: "Erro interno: Mais números fixados do que o permitido." }; // Should not happen due to previous check
    }
    if (availableNumbers.length < numbersToPick) {
        return { error: `Não há números suficientes disponíveis (${availableNumbers.length}) para completar o jogo de 15 dezenas com os números excluídos.` };
    }

    // Generation
    const game = new Set(fixed);
    while (game.size < 15) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const selectedNumber = availableNumbers.splice(randomIndex, 1)[0];
        game.add(selectedNumber);
    }

    return { game: Array.from(game).sort((a, b) => a - b) };
};

