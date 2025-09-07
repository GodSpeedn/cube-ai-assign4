def print_hello_world() -> None:
    """Prints 'Hello, World!'."""
    try:
        print('Hello, World!')
    except Exception as e:
        raise ValueError(f"Unexpected error occurred during execution: {e}")