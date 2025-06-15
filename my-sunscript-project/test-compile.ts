import 'dotenv/config';
import { SunScriptCompiler } from './src/compiler/Compiler';
import { OpenAIProvider } from './src/ai/providers/OpenAIProvider';

async function test() {
  const compiler = new SunScriptCompiler({
    outputDir: './dist',
    targetLanguage: 'javascript',
    aiProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    })
  });

  try {
    console.log('Compiling hello-world.sun...');
    const result = await compiler.compileFile('examples/hello-world.sun');
    console.log('Success!', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
