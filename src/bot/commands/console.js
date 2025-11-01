import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createApiAuthCode } from '../../services/auth.service.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('console')
  .setDescription('Generate an authentication code for API access');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Generate authentication code
    const { code, expiresAt } = await createApiAuthCode(
      interaction.user.id,
      interaction.user.tag,
      60 // Code expires in 60 minutes
    );
    
    // Create embed with code
    const codeEmbed = new EmbedBuilder()
      .setTitle('🔐 API Authentication Code')
      .setDescription('Use this code to authenticate with the Brotherhood KOS API.')
      .setColor(0x5865F2)
      .addFields(
        { 
          name: 'Your Code', 
          value: `\`\`\`${code}\`\`\``, 
          inline: false 
        },
        { 
          name: 'Expires', 
          value: `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>`, 
          inline: true 
        },
        {
          name: 'How to Use',
          value: [
            '1. Make a POST request to `/api/auth/login`',
            '2. Include the code in the request body: `{ "code": "YOUR_CODE" }`',
            '3. You will receive a session token to use for API requests',
            '4. Include the token in the Authorization header: `Bearer YOUR_TOKEN`'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: '⚠️ Keep this code private! Do not share it with anyone.' })
      .setTimestamp();
    
    // Try to send via DM first
    try {
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send({ embeds: [codeEmbed] });
      
      await interaction.editReply({
        content: '✅ Authentication code sent to your DMs!',
      });
    } catch (dmError) {
      // If DM fails, send in the channel (ephemeral)
      if (dmError.code === 50007) {
        await interaction.editReply({
          content: '⚠️ Could not send DM. Here is your code (only you can see this):',
          embeds: [codeEmbed],
        });
      } else {
        throw dmError;
      }
    }
    
    logger.success(`API auth code generated for ${interaction.user.tag}`);
    
  } catch (error) {
    logger.error('Error in console command:', error);
    await interaction.editReply({
      content: `❌ An error occurred: ${error.message}`,
    }).catch(() => {});
  }
}
