defmodule PlaylangElixir.Worker do
  @moduledoc """
  Default Popcorn receiver that evaluates Elixir source from JS `popcorn.call`.

  JS:
      await popcorn.call({ code: \"IO.puts(\\\"hi\\\")\" }, { process: \"main\" })
  """

  use GenServer

  require Popcorn.Wasm

  @process_name :main

  def start_link(args) do
    GenServer.start_link(__MODULE__, args, name: @process_name)
  end

  @impl true
  def init(_args) do
    # Resolves Popcorn.init() on the JS side and registers this process
    # as the default call/cast target.
    Popcorn.Wasm.ready(@process_name)
    {:ok, %{}}
  end

  @impl true
  def handle_info(msg, state) when Popcorn.Wasm.is_wasm_message(msg) do
    Popcorn.Wasm.handle_message!(msg, &handle_wasm/1)
    {:noreply, state}
  end

  def handle_info(_msg, state), do: {:noreply, state}

  defp handle_wasm({:wasm_call, %{"code" => code}}) when is_binary(code) do
    eval_elixir(code)
  end

  defp handle_wasm({:wasm_call, code}) when is_binary(code) do
    eval_elixir(code)
  end

  defp handle_wasm({:wasm_call, other}) do
    {:reject, %{ok: false, error: "expected {code: string}, got #{inspect(other)}"}, :error}
  end

  defp handle_wasm({:wasm_cast, _}), do: :ok

  defp handle_wasm({:wasm_event, _name, _data, _custom}), do: :ok

  defp eval_elixir(code) do
    try do
      {value, _bindings} = Code.eval_string(code, [], __ENV__)
      {:resolve, %{ok: true, value: inspect(value)}, :ok}
    rescue
      error ->
        {:resolve, %{ok: false, error: Exception.message(error)}, :ok}
    catch
      kind, reason ->
        {:resolve, %{ok: false, error: Exception.format_banner(kind, reason)}, :ok}
    end
  end
end
