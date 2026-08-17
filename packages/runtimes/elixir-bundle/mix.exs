defmodule PlaylangElixir.MixProject do
  use Mix.Project

  def project do
    [
      app: :playlang_elixir,
      version: "0.1.0",
      elixir: "1.17.3",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: [
        cook: ["deps.get", "compile", "popcorn.cook"]
      ]
    ]
  end

  def application do
    [
      # Only OTP apps present in AtomVM's runtime manifest may be listed.
      extra_applications: [],
      mod: {PlaylangElixir.Application, []}
    ]
  end

  defp deps do
    [
      # Popcorn currently requires OTP 26.0.2 + Elixir 1.17.3.
      {:popcorn, "~> 0.3.3"}
    ]
  end
end
