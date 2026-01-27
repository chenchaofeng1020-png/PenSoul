
const BASE_URL = 'http://localhost:3001/api';

async function verifyBackend() {
  console.log('🚀 Starting Backend Verification...');

  try {
    // 1. Create a new idea
    console.log('\n1. Creating a new idea...');
    const createRes = await fetch(`${BASE_URL}/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Idea ' + Date.now(),
        owner_id: 'mock-user-1'
      })
    });
    
    if (!createRes.ok) {
        throw new Error(`Failed to create idea: ${createRes.status} ${createRes.statusText}`);
    }

    const createData = await createRes.json();
    if (!createData.data || !createData.data.id) {
      throw new Error('Failed to create idea: No ID returned');
    }
    const ideaId = createData.data.id;
    console.log('✅ Created idea:', ideaId);

    // 2. Update the idea (PUT)
    console.log('\n2. Updating the idea (PUT)...');
    const updatePayload = {
      title: 'Updated Test Idea',
      structured_data: {
        product_name: 'Super Product',
        target_users: ['Developers', 'Designers'],
        core_features: ['Feature A', 'Feature B']
      }
    };
    const updateRes = await fetch(`${BASE_URL}/ideas/${ideaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });
    
    if (!updateRes.ok) {
        throw new Error(`Failed to update idea: ${updateRes.status} ${updateRes.statusText}`);
    }

    const updateData = await updateRes.json();
    
    if (updateData.data.title !== 'Updated Test Idea') {
      throw new Error('Title update failed');
    }
    if (updateData.data.structured_data.product_name !== 'Super Product') {
      throw new Error('Structured data update failed');
    }
    console.log('✅ Updated idea successfully');

    // 3. Convert idea to product
    console.log('\n3. Converting idea to product...');
    const convertRes = await fetch(`${BASE_URL}/ideas/${ideaId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: 'Converted Product ' + Date.now()
      })
    });

    if (!convertRes.ok) {
        throw new Error(`Failed to convert idea: ${convertRes.status} ${convertRes.statusText}`);
    }

    const convertData = await convertRes.json();
    
    if (!convertData.productId) {
      throw new Error('Conversion failed, no productId returned');
    }
    console.log('✅ Converted to product:', convertData.productId);

    // 4. Verify status change
    console.log('\n4. Verifying idea status...');
    const getRes = await fetch(`${BASE_URL}/ideas/${ideaId}`);
    const getData = await getRes.json();
    
    if (getData.data.status !== 'converted') {
      throw new Error(`Idea status is ${getData.data.status}, expected 'converted'`);
    }
    if (getData.data.converted_product_id !== convertData.productId) {
      throw new Error('Idea converted_product_id mismatch');
    }
    console.log('✅ Idea status verified');

    console.log('\n🎉 All verifications passed!');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error.message);
    process.exit(1);
  }
}

verifyBackend();
