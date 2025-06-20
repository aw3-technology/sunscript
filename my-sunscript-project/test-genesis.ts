import 'dotenv/config';
import { GenesisCompiler } from './src/compiler/GenesisCompiler';
import { OpenAIProvider } from './src/ai/providers/OpenAIProvider';

async function testGenesis() {
  const compiler = new GenesisCompiler({
    outputDir: './dist',
    targetLanguage: 'typescript',
    aiProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    })
  });

  // Listen to events
  compiler.on('genesis:start', ({ file }) => {
    console.log(`🚀 Starting Genesis compilation for: ${file}`);
  });

  compiler.on('genesis:success', ({ project, fileCount }) => {
    console.log(`✅ Successfully compiled project "${project}" with ${fileCount} files`);
  });

  compiler.on('import:error', ({ file, error }) => {
    console.error(`❌ Error importing ${file}:`, error.message);
  });

  compiler.on('genesis:error', ({ file, error }) => {
    console.error(`❌ Genesis compilation failed for ${file}:`, error.message);
  });

  try {
    const genesisFile = process.argv[2] || 'examples/genesis-example.sun';
    console.log(`Compiling Genesis project: ${genesisFile}`);
    
    const result = await compiler.compileProject(genesisFile);
    
    console.log('\n📋 Project Summary:');
    console.log(`  Name: ${result.project.name}`);
    console.log(`  Version: ${result.project.version}`);
    console.log(`  Author: ${result.project.author || 'Not specified'}`);
    console.log(`  Files compiled: ${result.files.size}`);
    console.log(`  Entry points: ${result.entrypoints.size}`);
    
    if (result.entrypoints.size > 0) {
      console.log('\n🎯 Entry Points:');
      for (const [name, target] of result.entrypoints) {
        console.log(`  - ${name}: ${target}`);
      }
    }
    
    // Write output
    await compiler.writeGenesisOutput(result);
    console.log('\n✨ Project compiled successfully!');
    
  } catch (error) {
    console.error('Compilation failed:', error);
    process.exit(1);
  }
}

testGenesis();