import 'dotenv/config';
import { SunScriptCompiler } from './src/compiler/Compiler';
import { OpenAIProvider } from './src/ai/providers/OpenAIProvider';

async function test() {
  const compiler = new SunScriptCompiler({
    outputDir: './dist',
    targetLanguage: 'html',  // ← Make sure this says 'html' not 'javascript'
    aiProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    })
  });

  try {
    console.log('Compiling hello-world.sun to HTML...');
    const result = await compiler.compileFile('examples/hello-world.sun');
    console.log('Success! Generated HTML file');
    console.log('Output files:', Object.keys(result.code));
    console.log('\nOpen dist/hello-world.index.html in your browser!');
  } catch (error) {
    console.error('Error:', error);
  }
}

test();