export default function Message(){
    const name = 'Mosh';
    if (name)
        return <h1>Hello {name}</h1>;
    return <h1>Hello World</h1>;
}