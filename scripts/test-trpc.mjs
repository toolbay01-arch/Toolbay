import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTRPCConnection() {
  try {
    console.log('🧪 Testing tRPC connection...');
    
    // Test if we can make a direct HTTP request to the tRPC endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc/categories.getMany`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ tRPC endpoint error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ tRPC endpoint working');
    console.log('Response data length:', data?.result?.data?.length || 'N/A');
    
  } catch (error) {
    console.error('❌ Error testing tRPC connection:', error);
  }
}

testTRPCConnection();
