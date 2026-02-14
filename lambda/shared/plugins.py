"""
Plugin manager for executing hooks and filters.
Provides functionality for plugin system integration.
"""
import boto3
import json
from typing import List, Dict, Any, Optional
import os

dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')


class PluginManager:
    """Manager for plugin hooks and filters."""
    
    def __init__(self):
        plugins_table_name = os.environ.get('PLUGINS_TABLE', 'cms-plugins-dev')
        self.plugins_table = dynamodb.Table(plugins_table_name)
        self._hook_cache: Dict[str, List[Dict[str, Any]]] = {}
    
    def get_active_plugins(self) -> List[Dict[str, Any]]:
        """Get all active plugins."""
        try:
            response = self.plugins_table.scan(
                FilterExpression='active = :true',
                ExpressionAttributeValues={':true': True}
            )
            return response.get('Items', [])
        except Exception as e:
            print(f"Error fetching active plugins: {e}")
            return []
    
    def execute_hook(self, hook_name: str, data: Any) -> Any:
        """
        Execute all plugin functions registered for a hook.
        
        Args:
            hook_name: Name of the hook to execute
            data: Data to pass to hook functions
            
        Returns:
            Modified data after all hook functions have been applied
        """
        try:
            plugins = self.get_active_plugins()
            
            # Get all functions for this hook, sorted by priority
            hook_functions = []
            for plugin in plugins:
                for hook in plugin.get('hooks', []):
                    if hook['hook_name'] == hook_name:
                        hook_functions.append({
                            'function_arn': hook['function_arn'],
                            'priority': hook.get('priority', 10),
                            'plugin_id': plugin['id']
                        })
            
            # Sort by priority (lower number = higher priority)
            hook_functions.sort(key=lambda x: x['priority'])
            
            # Execute each function in order
            result = data
            for hook_func in hook_functions:
                try:
                    response = lambda_client.invoke(
                        FunctionName=hook_func['function_arn'],
                        InvocationType='RequestResponse',
                        Payload=json.dumps({'hook': hook_name, 'data': result})
                    )
                    payload = json.loads(response['Payload'].read())
                    if payload.get('statusCode') == 200:
                        body = payload.get('body', '{}')
                        if isinstance(body, str):
                            result = json.loads(body)
                        else:
                            result = body
                except Exception as e:
                    # Log error but continue with other plugins
                    print(f"Plugin hook error for {hook_func['plugin_id']}: {e}")
                    continue
            
            return result
        
        except Exception as e:
            print(f"Error executing hook {hook_name}: {e}")
            # Return original data if hook execution fails
            return data
    
    def apply_content_filters(self, content: str, content_type: str) -> str:
        """
        Apply content filter hooks for rendering.
        
        Args:
            content: Content HTML/text to filter
            content_type: Type of content (post, page, gallery, project)
            
        Returns:
            Filtered content
        """
        hook_name = f'content_render_{content_type}'
        result = self.execute_hook(hook_name, content)
        
        # Ensure we return a string
        if isinstance(result, str):
            return result
        return content
