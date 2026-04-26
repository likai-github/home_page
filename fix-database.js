// 数据库修复脚本
// 运行: node fix-database.js

async function fixDatabase() {
  console.log('🔧 开始修复数据库...\n');
  
  const apiBase = process.env.API_URL || 'http://localhost:8788/api';
  
  try {
    // 1. 检查当前状态
    console.log('1️⃣ 检查数据库状态...');
    const statusRes = await fetch(`${apiBase}/database/status`);
    const status = await statusRes.json();
    
    if (!statusRes.ok) {
      throw new Error('无法连接到数据库: ' + status.error);
    }
    
    console.log(`   当前版本: ${status.currentVersion}`);
    console.log(`   最新版本: ${status.latestVersion}`);
    console.log(`   需要更新: ${status.needsUpdate ? '是' : '否'}`);
    
    // 2. 执行迁移
    if (status.needsUpdate || status.currentVersion === 0) {
      console.log('\n2️⃣ 执行数据库迁移...');
      const migrateRes = await fetch(`${apiBase}/database/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const migrateResult = await migrateRes.json();
      
      if (migrateRes.ok) {
        console.log('✅ 迁移成功！');
        console.log(`   从版本 ${migrateResult.previousVersion} 升级到 ${migrateResult.currentVersion}`);
        console.log(`   执行了 ${migrateResult.migrationsExecuted} 个迁移`);
      } else {
        console.error('❌ 迁移失败:', migrateResult.error);
        console.error('   详细信息:', migrateResult.message);
        
        // 如果迁移失败，询问是否重置
        console.log('\n⚠️  迁移失败，可能需要重置数据库');
        console.log('   警告：重置将删除所有数据！');
        console.log('   如需重置，请手动运行: node fix-database.js --reset');
        return;
      }
    } else {
      console.log('\n✅ 数据库已是最新版本，无需迁移');
    }
    
    // 3. 验证表是否创建成功
    console.log('\n3️⃣ 验证数据库表...');
    const tablesRes = await fetch(`${apiBase}/database/tables`);
    const tablesData = await tablesRes.json();
    
    if (tablesRes.ok) {
      const requiredTables = ['config', 'api_platforms', 'api_models', 'users', 'roles', 'permissions'];
      const existingTables = tablesData.tables.map(t => t.name);
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length === 0) {
        console.log('✅ 所有必需的表都已创建');
        tablesData.tables.forEach(table => {
          console.log(`   ✓ ${table.name} (${table.row_count} 行)`);
        });
      } else {
        console.log('⚠️  仍有表缺失:');
        missingTables.forEach(table => {
          console.log(`   ✗ ${table}`);
        });
      }
    }
    
    // 4. 测试系统设置 API
    console.log('\n4️⃣ 测试系统设置 API...');
    const settingsRes = await fetch(`${apiBase}/settings`);
    const settingsData = await settingsRes.json();
    
    if (settingsRes.ok) {
      console.log('✅ 系统设置 API 正常');
      console.log('   配置项:', Object.keys(settingsData.settings || {}).join(', '));
    } else {
      console.log('❌ 系统设置 API 失败:', settingsData.error);
    }
    
    // 5. 测试平台 API
    console.log('\n5️⃣ 测试平台管理 API...');
    const platformsRes = await fetch(`${apiBase}/platforms`);
    const platformsData = await platformsRes.json();
    
    if (platformsRes.ok) {
      console.log('✅ 平台管理 API 正常');
      console.log(`   平台数量: ${platformsData.platforms?.length || 0}`);
    } else {
      console.log('❌ 平台管理 API 失败:', platformsData.error);
    }
    
    console.log('\n🎉 数据库修复完成！');
    console.log('\n📝 后续步骤:');
    console.log('   1. 刷新管理后台页面');
    console.log('   2. 尝试修改系统设置');
    console.log('   3. 尝试添加 API 平台');
    
  } catch (error) {
    console.error('\n❌ 修复过程出错:', error.message);
    console.log('\n请检查:');
    console.log('   1. 开发服务器是否运行: npm run dev');
    console.log('   2. API 地址是否正确');
    console.log('   3. 网络连接是否正常');
  }
}

// 重置数据库
async function resetDatabase() {
  console.log('🗑️  开始重置数据库...\n');
  console.log('⚠️  警告：这将删除所有数据！\n');
  
  const apiBase = process.env.API_URL || 'http://localhost:8788/api';
  
  try {
    const resetRes = await fetch(`${apiBase}/database/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const resetResult = await resetRes.json();
    
    if (resetRes.ok) {
      console.log('✅ 数据库已重置');
      console.log('   ' + resetResult.message);
      console.log('\n现在执行迁移...\n');
      
      // 执行迁移
      await fixDatabase();
    } else {
      console.error('❌ 重置失败:', resetResult.error);
    }
  } catch (error) {
    console.error('❌ 重置过程出错:', error.message);
  }
}

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--reset')) {
  resetDatabase();
} else {
  fixDatabase();
}
