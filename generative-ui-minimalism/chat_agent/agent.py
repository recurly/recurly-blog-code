from google.adk.agents.llm_agent import Agent

def get_weather() -> dict:
    """Returns the current weather conditions"""
    return {
      "status": "success",
      "element": {
        "type": "weather",
        "params": {
          "location": "New York City",
          "condition": "snowy",
          "temperature": {
            "value": "25",
            "unit": "celsius"
          }
        }
      }
    }

root_agent = Agent(
    model='gemini-3-flash-preview',
    name='root_agent',
    description="Shows information about the weather",
    instruction="""
      You are a helpful assistant that retrieves weather data. Use the 'get_weather' tool when asked.
      After calling the tool, respond with a brief affirmative acknowledgment only (e.g. 'Here's the current weather.').
      Do NOT describe or repeat any of the data returned by the tool — the UI will handle rendering it.
    """,
    tools=[get_weather]
)
